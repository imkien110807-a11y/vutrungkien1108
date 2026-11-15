(function () {
    'use strict';

    /* ====== LINK TRANG BÀI HỌC ======
       Mặc định: bấm vào bài sẽ mở nội dung bài ngay trong trang này (#bai1 ... #bai6).
       Nếu mỗi bài có trang riêng, điền URL vào đây, ví dụ: bai1: 'bai-1.html' */
    const LESSON_PAGES = {
        bai1: '',
        bai2: '',
        bai3: '',
        bai4: '',
        bai5: '',
        bai6: ''
    };

    const NAV_OFFSET = 80; // chiều cao thanh điều hướng (h-20)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Áp dụng URL trang riêng (nếu có)
    document.querySelectorAll('[data-lesson]').forEach(function (a) {
        const url = LESSON_PAGES[a.dataset.lesson];
        if (url) a.setAttribute('href', url);
    });

    /* ====== HIỆN DẦN THEO TỐC ĐỘ CUỘN ====== */
    const REVEAL_SEL = 'h3,h4,h5,p,ul,ol,table,div.flex,div.italic';
    let revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    function updateReveal() {
        const vh = window.innerHeight;
        const start = vh * 0.97;   // phần tử bắt đầu hiện khi chạm mép dưới màn hình
        const span = vh * 0.27;    // hiện rõ hoàn toàn sau khi đi lên khoảng 27% chiều cao màn hình
        for (let i = 0; i < revealEls.length; i++) {
            const el = revealEls[i];
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue; // đang ẩn (bài chưa mở)
            let p = 1;
            if (!reduceMotion) {
                const baseTop = r.top - (el._shift || 0);
                const lag = (parseFloat(el.dataset.lag) || 0) * vh * 0.05;
                p = (start - lag - baseTop) / span;
                p = p < 0 ? 0 : (p > 1 ? 1 : p);
            }
            const shift = (1 - p) * 40;
            el._shift = shift;
            el.style.opacity = p.toFixed(3);
            el.style.transform = p >= 1 ? 'none' : 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
        }
    }

    function prepareLesson(root) {
        root.querySelectorAll(REVEAL_SEL).forEach(function (n) {
            const outer = n.parentElement.closest(REVEAL_SEL);
            if (outer && root.contains(outer)) return; // chỉ lấy khối ngoài cùng
            n.classList.add('reveal');
        });
        revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    }

    /* ====== CUỘN MƯỢT (quán tính) ====== */
    let current = window.scrollY, target = current, running = false, lastT = 0;

    function maxScroll() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function frame(t) {
        const dt = Math.min(50, t - (lastT || t));
        lastT = t;
        const diff = target - current;
        if (Math.abs(diff) < 0.4) {
            current = target;
            running = false;
        } else {
            current += diff * (1 - Math.pow(1 - 0.11, dt / 16.67));
        }
        window.scrollTo(0, current);
        updateReveal();
        if (running) requestAnimationFrame(frame); else lastT = 0;
    }

    function smoothTo(y) {
        target = Math.max(0, Math.min(maxScroll(), y));
        if (reduceMotion) {
            window.scrollTo(0, target);
            current = target;
            updateReveal();
            return;
        }
        if (!running) {
            current = window.scrollY;
            running = true;
            requestAnimationFrame(frame);
        }
    }

    function canScrollInside(node, dy) {
        while (node && node !== document.body && node !== document.documentElement) {
            if (node.nodeType === 1) {
                const oy = getComputedStyle(node).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
                    const atTop = node.scrollTop <= 0;
                    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
                    if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
                }
            }
            node = node.parentNode;
        }
        return false;
    }

    if (!reduceMotion) {
        window.addEventListener('wheel', function (e) {
            if (e.ctrlKey || e.defaultPrevented) return;
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            let dy = e.deltaY;
            if (e.deltaMode === 1) dy *= 32;
            else if (e.deltaMode === 2) dy *= window.innerHeight;
            if (canScrollInside(e.target, dy)) return;
            e.preventDefault();
            if (!running) { current = window.scrollY; target = current; }
            target = Math.max(0, Math.min(maxScroll(), target + dy));
            if (!running) { running = true; requestAnimationFrame(frame); }
        }, { passive: false });
    }

    // Cuộn bằng bàn phím / kéo thanh cuộn: đồng bộ lại vị trí
    window.addEventListener('scroll', function () {
        if (running && Math.abs(window.scrollY - current) > 3) running = false;
        if (!running) { current = target = window.scrollY; }
        updateReveal();
    }, { passive: true });

    window.addEventListener('resize', updateReveal);

    /* ====== HIỂN THỊ BÀI HỌC ====== */
    function showProject(id) {
        const lesson = document.getElementById(id);
        if (!lesson || !lesson.classList.contains('project-content')) return;

        document.querySelectorAll('.project-content').forEach(function (c) { c.classList.remove('active'); });
        const msg = document.getElementById('default-msg');
        if (msg) msg.style.display = 'none';
        lesson.classList.add('active');
        prepareLesson(lesson);
        updateReveal();

        const container = document.getElementById('project-container');
        smoothTo(container.getBoundingClientRect().top + window.scrollY - NAV_OFFSET - 20);
    }
    window.showProject = showProject; // giữ tương thích với onclick="showProject('bai1')"

    function lessonFromHash() {
        const id = window.location.hash.replace('#', '');
        return /^bai\d+$/.test(id) && document.getElementById(id) ? id : null;
    }

    window.addEventListener('hashchange', function () {
        const id = lessonFromHash();
        if (id) showProject(id);
    });

    /* ====== XỬ LÝ CLICK LINK ====== */
    const dd = document.getElementById('navProjects');
    if (dd) dd.addEventListener('mouseleave', function () { dd.classList.remove('force-close'); });

    document.addEventListener('click', function (e) {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const hash = a.getAttribute('href');
        const id = hash.slice(1);

        if (dd && dd.contains(a)) { dd.classList.add('force-close'); a.blur(); }

        if (a.dataset.lesson) {               // bấm vào tên bài
            e.preventDefault();
            try { history.pushState(null, '', hash); } catch (err) { /* file:// ở một số trình duyệt */ }
            showProject(id);
            return;
        }

        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        try { history.pushState(null, '', hash); } catch (err) {}
        smoothTo(id === 'home' ? 0 : el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET + 1);
    });

    /* ====== KHỞI TẠO ====== */
    updateReveal();
    const initial = lessonFromHash();
    if (initial) setTimeout(function () { showProject(initial); }, 60);
})();
