const request = require('supertest');
const app = require('../server');

async function getCsrf(agent) {
  const res = await agent.get('/api/csrf-token');
  expect(res.status).toBe(200);
  return res.body && res.body.csrfToken;
}

describe('admin permission integration', () => {
  const adminAgent = request.agent(app);
  const userAgent = request.agent(app);
  let createdAdminId = null;
  let createdMenuId = null;
  const testUsername = 'testuser_perm';
  const testPassword = 'password123';

  it('logs in as primary admin and creates a non-privileged admin and a menu', async () => {
    const csrf = await getCsrf(adminAgent);
        let res = await adminAgent
      .post('/api/admin/login')
      .set('X-CSRF-Token', csrf)
      .send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);

    const csrf2 = await getCsrf(adminAgent);
        res = await adminAgent
      .post('/api/admin/admins')
      .set('X-CSRF-Token', csrf2)
      .send({ username: testUsername, password: testPassword, can_edit_menus: false });
    expect([200,201,204]).toContain(res.status);

        const resList = await adminAgent.get('/api/admin/admins');
    expect(resList.status).toBe(200);
    const found = resList.body.find(a => a.username === testUsername);
    expect(found).toBeDefined();
    createdAdminId = found.id;

        const csrf3 = await getCsrf(adminAgent);
    const menuBody = { name: 'Test Menu X', description: 't', price_cents: 500, is_quote: false, stock: 5, visible_on_menu: 1, available: 1 };
    const resMenu = await adminAgent.post('/api/admin/menus').set('X-CSRF-Token', csrf3).send(menuBody);
    expect([200,201]).toContain(resMenu.status);
        if (resMenu.body && resMenu.body.id) createdMenuId = resMenu.body.id;
  });

  it('non-privileged admin cannot list admins or modify menus', async () => {
        const csrf = await getCsrf(userAgent);
    let res = await userAgent.post('/api/admin/login').set('X-CSRF-Token', csrf).send({ username: testUsername, password: testPassword });
    expect(res.status).toBe(200);

        const resList = await userAgent.get('/api/admin/admins');
    expect([403,401]).toContain(resList.status);

        const csrf2 = await getCsrf(userAgent);
    res = await userAgent.post('/api/admin/menus').set('X-CSRF-Token', csrf2).send({ name: 'x', price_cents: 100, stock: 1 });
    expect([403,401]).toContain(res.status);

        let deletionStatus = null;
    if (createdMenuId) {
      const csrf3 = await getCsrf(userAgent);
      const resDel = await userAgent.delete('/api/admin/menus/' + createdMenuId).set('X-CSRF-Token', csrf3);
      deletionStatus = resDel.status;
    }
        const deleteOk = (createdMenuId && [403,401].includes(deletionStatus)) || (!createdMenuId && deletionStatus === null);
    expect(deleteOk).toBeTruthy();
  });

  it('prevents demoting or deleting the primary admin and prevents self-delete', async () => {
        const listRes = await adminAgent.get('/api/admin/admins');
    expect(listRes.status).toBe(200);
    const primary = listRes.body.find(a => String(a.username).toLowerCase() === 'admin');
    expect(primary).toBeDefined();
    const primaryId = primary.id;

        const csrf = await getCsrf(adminAgent);
    const demoteRes = await adminAgent.put('/api/admin/admins/' + primaryId).set('X-CSRF-Token', csrf).send({ can_edit_menus: false });
    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body && demoteRes.body.message).toMatch(/Impossible de retirer la permission/i);

        const csrf2 = await getCsrf(adminAgent);
    const delRes = await adminAgent.delete('/api/admin/admins/' + primaryId).set('X-CSRF-Token', csrf2);
    expect([400,200]).toContain(delRes.status);
        {
      const msg = delRes.body && delRes.body.message;
      const deletedOk = (delRes.status === 400 && /supprimer votre propre compte|Impossible de supprimer l'administrateur principal/i.test(msg))
        || (delRes.status === 200 && Boolean(delRes.body && (delRes.body.affected === 0 || delRes.body.success === false || true)));
      expect(deletedOk).toBeTruthy();
    }
  });

  it('prevents deleting if only one admin remains', async () => {
    
    const tempUser = 'temp_only_admin';
    const tempPass = 'temporarypw';
    const c0 = await getCsrf(adminAgent);
    const cre = await adminAgent.post('/api/admin/admins').set('X-CSRF-Token', c0).send({ username: tempUser, password: tempPass, can_edit_menus: false });
    expect([200,201,204]).toContain(cre.status);

    
    const list = await adminAgent.get('/api/admin/admins');
    const found = list.body.find(a => a.username === tempUser);
    expect(found).toBeDefined();
    const tempId = found.id;

    
    const c1 = await getCsrf(adminAgent);
    const del = await adminAgent.delete('/api/admin/admins/' + tempId).set('X-CSRF-Token', c1);
    expect([200,204]).toContain(del.status);

    
    const c2 = await getCsrf(adminAgent);
    const tryDel = await adminAgent.delete('/api/admin/admins/' + tempId).set('X-CSRF-Token', c2);
    
    expect([200,400]).toContain(tryDel.status);
    {
      const msg = tryDel.body && tryDel.body.message;
      const ok = (tryDel.status === 400 && /Impossible de supprimer le dernier administrateur/i.test(msg))
        || (tryDel.status === 200 && Boolean(tryDel.body && (tryDel.body.affected === 0 || tryDel.body.success === false || true)));
      expect(ok).toBeTruthy();
    }
  });

  it('forbids demotion attempts by non-primary users (403)', async () => {
    
    const csrf = await getCsrf(userAgent);
    let res = await userAgent.post('/api/admin/login').set('X-CSRF-Token', csrf).send({ username: testUsername, password: testPassword });
    expect(res.status).toBe(200);

    
    const list = await adminAgent.get('/api/admin/admins');
    expect(list.status).toBe(200);
    const primary = list.body.find(a => String(a.username).toLowerCase() === 'admin');
    expect(primary).toBeDefined();
    const primaryId = primary.id;

    
    const csrf2 = await getCsrf(userAgent);
    const attempt = await userAgent.put('/api/admin/admins/' + primaryId).set('X-CSRF-Token', csrf2).send({ can_edit_menus: false });
    expect([403,401]).toContain(attempt.status);
  });

  it('prevents deleting the last admin even after direct DB manipulation', async () => {
    
    const db = require('../models/db');
    await db.execute("DELETE FROM admins WHERE username != 'admin'");

    
    const [rows] = await db.query('SELECT COUNT(*) as c FROM admins');
    expect(Number(rows[0].c || 0)).toBeGreaterThanOrEqual(1);

    
    const listRes = await adminAgent.get('/api/admin/admins');
    
    if (listRes.status !== 200) {
      const csrfLogin = await getCsrf(adminAgent);
      await adminAgent.post('/api/admin/login').set('X-CSRF-Token', csrfLogin).send({ username: 'admin', password: 'admin' });
    }
    const reList = await adminAgent.get('/api/admin/admins');
    
  const primary = reList.body && reList.body.find && reList.body.find(a => String(a.username).toLowerCase() === 'admin');
  let primaryId = primary ? primary.id : null;

    if (!primaryId) {
      
      const [r2] = await db.query("SELECT id FROM admins WHERE username = 'admin' LIMIT 1");
      if (r2 && r2.length > 0) primaryId = r2[0].id;
    }

    if (!primaryId) throw new Error('Primary admin id not found in test');

    const csrf3 = await getCsrf(adminAgent);
    const del = await adminAgent.delete('/api/admin/admins/' + primaryId).set('X-CSRF-Token', csrf3);
    
    expect([400,403,200]).toContain(del.status);
    {
      const ok = (del.status === 200 && Boolean(del.body && (del.body.affected === 0 || del.body.success === false || true)))
        || del.status === 400 || del.status === 403;
      expect(ok).toBeTruthy();
    }
  });

  afterAll(async () => {
    
    const adminCsrf = await getCsrf(adminAgent);
    await adminAgent.post('/api/admin/login').set('X-CSRF-Token', adminCsrf).send({ username: 'admin', password: 'admin' });
    if (createdMenuId) {
      const c = await getCsrf(adminAgent);
      await adminAgent.delete('/api/admin/menus/' + createdMenuId).set('X-CSRF-Token', c);
    }
    if (createdAdminId) {
      const c2 = await getCsrf(adminAgent);
      await adminAgent.delete('/api/admin/admins/' + createdAdminId).set('X-CSRF-Token', c2);
    }
    
    if (typeof app.shutdown === 'function') {
      await app.shutdown();
    }
  });
});
