import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MAT, profileParts } from './svg2d.js';

export class View3D {
  constructor(el, onPick) {
    this.el = el; this.onPick = onPick;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg3d').trim() || '#eef0f2');
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
    this.camera.position.set(1.7, 2.0, 6.8);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(1.7, 1.1, 0.8);
    this.controls.enableDamping = true;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a0, 1.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(3, 5, 6); this.scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.5); dl2.position.set(-3, 3, 2); this.scene.add(dl2);
    this.root = new THREE.Group(); this.root.scale.setScalar(0.001); this.scene.add(this.root);
    this.mats = new Map();
    this.doorK = 0; this.doorTarget = 0; this.bedK = 0; this.bedTarget = 0;
    this.showRoom = true; this.showDoors = true;
    this.doors = []; this.beds = [];
    const ro = new ResizeObserver(() => this.resize()); ro.observe(el);
    let down = null;
    this.renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = this.renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const rc = new THREE.Raycaster(); rc.setFromCamera(m, this.camera);
      const hit = rc.intersectObjects(this.root.children, true).find(h => h.object.isMesh && h.object.userData.elemId && h.object.visible);
      if (hit) this.onPick(hit.object.userData.elemId);
    });
    const loop = () => { requestAnimationFrame(loop); this.tick(); };
    loop();
  }
  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!this.mats.has(key)) this.mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts }));
    return this.mats.get(key);
  }
  clear() {
    for (const c of [...this.root.children]) {
      this.root.remove(c);
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.doors = []; this.beds = [];
  }
  boxMesh(sx, sy, sz, color, elemId, edges = true) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(geo, this.mat(color));
    m.userData.elemId = elemId;
    if (edges) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMat || (this.edgeMat = new THREE.LineBasicMaterial({ color: 0x5a4a33, transparent: true, opacity: 0.35 })));
      m.add(e);
    }
    return m;
  }
  detailMesh(sx, sy, sz, color, kind, elemId) {
    let mat;
    if (kind === 'glass') mat = this.glassMat || (this.glassMat = new THREE.MeshStandardMaterial({ color: '#cfe0e8', metalness: 0.9, roughness: 0.08 }));
    else if (kind === 'groove') mat = this.mat(new THREE.Color(color).multiplyScalar(0.7).getStyle());
    else mat = this.mat(new THREE.Color(color).multiplyScalar(0.96).getStyle());
    const geo = new THREE.BoxGeometry(Math.max(sx, 0.5), Math.max(sy, 0.5), Math.max(sz, 0.5));
    const m = new THREE.Mesh(geo, mat); m.userData.elemId = elemId;
    if (kind === 'bar') m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMat || (this.edgeMat = new THREE.LineBasicMaterial({ color: 0x5a4a33, transparent: true, opacity: 0.35 }))));
    return m;
  }
  update(s, sc, selId) {
    this.clear();
    const W = s.room.back, H = s.room.height;
    // Raum
    if (this.showRoom) {
      const room = new THREE.Group();
      const wm = this.mat('#f4f1ec', { side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, Math.max(s.room.left, s.room.right) + 600), this.mat('#d9d3c8', { side: THREE.DoubleSide }));
      fl.rotation.x = -Math.PI / 2; fl.position.set(W / 2, -1, (Math.max(s.room.left, s.room.right) + 600) / 2); room.add(fl);
      const bw = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wm); bw.position.set(W / 2, H / 2, -1); room.add(bw);
      const lw = new THREE.Mesh(new THREE.PlaneGeometry(s.room.left, H), wm); lw.rotation.y = Math.PI / 2; lw.position.set(-1, H / 2, s.room.left / 2); room.add(lw);
      const rw = new THREE.Mesh(new THREE.PlaneGeometry(s.room.right, H), wm); rw.rotation.y = -Math.PI / 2; rw.position.set(W + 1, H / 2, s.room.right / 2); room.add(rw);
      this.root.add(room);
    }
    let selBox = null;
    for (const b of sc.boxes) {
      if (b.bedPart) continue;
      const sx = b.max[0] - b.min[0], sy = b.max[2] - b.min[2], sz = b.max[1] - b.min[1];
      const color = b.color || (MAT[b.mat] || MAT.mpx)[0];
      const m = this.boxMesh(sx, sy, sz, color, b.elemId, b.mat !== 'item');
      m.position.set(b.min[0] + sx / 2, b.min[2] + sy / 2, b.min[1] + sz / 2);
      this.root.add(m);
      if (b.elemId === selId) { selBox = selBox || new THREE.Box3(); selBox.expandByPoint(new THREE.Vector3(b.min[0], b.min[2], b.min[1])); selBox.expandByPoint(new THREE.Vector3(b.max[0], b.max[2], b.max[1])); }
    }
    // Türen
    for (const dr of sc.doors) {
      const piv = new THREE.Group();
      piv.position.set(dr.hinge[0], dr.z0, dr.hinge[1]);
      const alongX = dr.s[0] !== 0;
      const m = this.boxMesh(alongX ? dr.w : dr.t, dr.h, alongX ? dr.t : dr.w, dr.color, dr.elemId);
      m.position.set(dr.s[0] * dr.w / 2 + dr.n[0] * dr.t / 2, dr.h / 2, dr.s[1] * dr.w / 2 + dr.n[1] * dr.t / 2);
      piv.add(m);
      // Profil: a entlang s, b nach oben, z nach außen (n) ab Türvorderseite
      for (const q of profileParts(dr.profile, dr.w, dr.h)) {
        const xs = [q.a0, q.a1].map(a => [dr.s[0] * a, dr.s[1] * a]);
        const zs = [dr.t + q.z0, dr.t + q.z1].map(z => [dr.n[0] * z, dr.n[1] * z]);
        const X = [xs[0][0] + zs[0][0], xs[1][0] + zs[1][0]], Z = [xs[0][1] + zs[0][1], xs[1][1] + zs[1][1]];
        const dm = this.detailMesh(Math.abs(X[1] - X[0]), q.b1 - q.b0, Math.abs(Z[1] - Z[0]), dr.color, q.kind, dr.elemId);
        dm.position.set((X[0] + X[1]) / 2, (q.b0 + q.b1) / 2, (Z[0] + Z[1]) / 2);
        piv.add(dm);
      }
      const rot = [dr.s[1], -dr.s[0]];
      piv.userData.sign = (Math.abs(rot[0] - dr.n[0]) < 1e-6 && Math.abs(rot[1] - dr.n[1]) < 1e-6) ? 1 : -1;
      piv.visible = this.showDoors;
      this.root.add(piv); this.doors.push(piv);
    }
    // Klappbetten
    for (const bed of sc.beds) {
      const fr = bed.frame;
      const grp = new THREE.Group();
      const mtx = new THREE.Matrix4().makeBasis(new THREE.Vector3(fr.eu[0], 0, fr.eu[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(fr.n[0], 0, fr.n[1]));
      mtx.setPosition(fr.P0[0], 0, fr.P0[1]);
      grp.matrixAutoUpdate = false; grp.matrix.copy(mtx);
      const piv = new THREE.Group(); piv.position.set(bed.uc, bed.hp, bed.dp);
      for (const p of bed.parts) {
        const color = p.color || (MAT[p.mat] || MAT.mpx)[0];
        const m = this.boxMesh(p.X1 - p.X0, p.Y1 - p.Y0, p.Z1 - p.Z0, color, bed.id);
        m.position.set((p.X0 + p.X1) / 2, (p.Y0 + p.Y1) / 2, (p.Z0 + p.Z1) / 2);
        piv.add(m);
        for (const q of profileParts(p.profile, p.X1 - p.X0, p.Z1 - p.Z0)) {
          const dm = this.detailMesh(q.a1 - q.a0, q.z1 - q.z0, q.b1 - q.b0, color, q.kind, bed.id);
          dm.position.set(p.X0 + (q.a0 + q.a1) / 2, p.Y0 - (q.z0 + q.z1) / 2, p.Z0 + (q.b0 + q.b1) / 2);
          piv.add(dm);
        }
      }
      const legs = new THREE.Group();
      for (const [x0, x1] of bed.legs) {
        const m = this.boxMesh(x1 - x0, bed.hp, 40, '#8f8f8f', bed.id);
        m.position.set((x0 + x1) / 2, -bed.hp / 2, bed.foL - 80); legs.add(m);
      }
      piv.add(legs); piv.userData.legs = legs;
      grp.add(piv); this.root.add(grp); this.beds.push(piv);
      if (bed.id === selId) {
        selBox = selBox || new THREE.Box3();
      }
    }
    if (selBox) { const h = new THREE.Box3Helper(selBox.expandByScalar(15), 0x2563eb); this.root.add(h); }
    this.applyAnim(true);
    this.controls.target.set(W / 2000, 1.1, 0.9);
  }
  setDoors(open) { this.doorTarget = open ? 1 : 0; }
  setBed(open) { this.bedTarget = open ? 1 : 0; }
  applyAnim(force) {
    for (const p of this.doors) p.rotation.y = p.userData.sign * this.doorK * Math.PI * 0.55;
    for (const p of this.beds) { p.rotation.x = -(1 - this.bedK) * Math.PI / 2; p.userData.legs.visible = this.bedK > 0.97; }
  }
  tick() {
    const step = (k, t) => Math.abs(t - k) < 0.01 ? t : k + (t - k) * 0.12;
    const a = step(this.doorK, this.doorTarget), b = step(this.bedK, this.bedTarget);
    if (a !== this.doorK || b !== this.bedK) { this.doorK = a; this.bedK = b; this.applyAnim(); }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
