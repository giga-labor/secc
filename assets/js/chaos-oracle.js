(() => {
  const root = document.querySelector('[data-chaos-oracle]');
  if (!root) return;
  const status = root.querySelector('[data-chaos-status]');
  const canvasHost = root.querySelector('[data-chaos-canvas]');
  const btn = root.querySelector('[data-chaos-start]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (reduce) {
    setStatus('Modalita ridotta attiva: esperienza 3D disabilitata.');
    if (btn) btn.disabled = true;
    return;
  }

  const loadScript = (url) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script_load_failed'));
    document.head.appendChild(script);
  });

  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    setStatus('Caricamento motore 3D...');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js');
      if (!window.THREE || !canvasHost) throw new Error('three_unavailable');

      const scene = new window.THREE.Scene();
      scene.background = new window.THREE.Color(0x050812);
      const camera = new window.THREE.PerspectiveCamera(55, canvasHost.clientWidth / canvasHost.clientHeight, 0.1, 100);
      camera.position.set(0, 0.4, 4.4);

      const renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
      canvasHost.appendChild(renderer.domElement);

      const ambient = new window.THREE.AmbientLight(0x66aaff, 0.55);
      const key = new window.THREE.DirectionalLight(0xffcc88, 1.2);
      key.position.set(2, 2, 3);
      scene.add(ambient, key);

      const group = new window.THREE.Group();
      scene.add(group);
      const geometry = new window.THREE.IcosahedronGeometry(1, 1);
      const material = new window.THREE.MeshStandardMaterial({
        color: 0x4db7ff,
        metalness: 0.25,
        roughness: 0.38
      });
      const mesh = new window.THREE.Mesh(geometry, material);
      group.add(mesh);

      const ring = new window.THREE.Mesh(
        new window.THREE.TorusGeometry(1.6, 0.045, 16, 72),
        new window.THREE.MeshBasicMaterial({ color: 0xff86df })
      );
      ring.rotation.x = 1.1;
      scene.add(ring);

      let rafId = 0;
      const animate = () => {
        rafId = window.requestAnimationFrame(animate);
        mesh.rotation.x += 0.0042;
        mesh.rotation.y += 0.0065;
        ring.rotation.z -= 0.003;
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w = Math.max(320, canvasHost.clientWidth);
        const h = Math.max(220, canvasHost.clientHeight);
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize, { passive: true });
      onResize();
      setStatus('Chaos Oracle attivo (cameo 3D).');

      window.addEventListener('pagehide', () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      }, { once: true });
    } catch (_) {
      setStatus('Impossibile avviare la scena 3D su questo dispositivo.');
    }
  };

  if (btn) {
    btn.addEventListener('click', start, { once: true });
  } else {
    start();
  }
})();
