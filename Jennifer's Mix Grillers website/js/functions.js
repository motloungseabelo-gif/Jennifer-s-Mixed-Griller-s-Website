const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const App = {
    init() {
        updateFooterDate();
        setupMenu();
        setupRevealAnimations();
        markActivePage();
        setupContactForm();
        setupHeaderEffects();
        setupStatCounters();
        setupVisualParallax();
        optimizeMediaLoading();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());

function updateFooterDate() {
    const footerDate = document.getElementById('footerDate');
    if (footerDate) {
        footerDate.textContent = new Date().getFullYear();
    }
}

function setupMenu() {
    const button = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');

    if (!button || !nav) return;

    const closeMenu = () => {
        nav.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Open navigation menu');
    };

    const openMenu = () => {
        nav.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-label', 'Close navigation menu');
    };

    button.addEventListener('click', () => {
        const isOpen = nav.classList.contains('active');
        isOpen ? closeMenu() : openMenu();
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', event => {
        if (!nav.contains(event.target) && !button.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeMenu();
            button.focus();
        }
    });

    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth > 980) {
            closeMenu();
        }
    }, 120));
}

function markActivePage() {
    const current = window.location.pathname.split('/').pop() || 'Home.html';
    document.querySelectorAll('.nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === current) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

function setupRevealAnimations() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length || !('IntersectionObserver' in window) || prefersReducedMotion.matches) {
        items.forEach(item => item.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.14, rootMargin: '0px 0px -30px 0px' });

    items.forEach(item => observer.observe(item));
}

function setupHeaderEffects() {
    const header = document.querySelector('.header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    onScroll();
    window.addEventListener('scroll', throttleWithAnimationFrame(onScroll), { passive: true });
}

function setupStatCounters() {
    const stats = document.querySelectorAll('.stat-card strong');
    if (!stats.length) return;

    const parseTargetValue = text => {
        const numeric = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (Number.isNaN(numeric)) return null;
        return {
            number: numeric,
            suffix: text.replace(/[0-9.]/g, ''),
            decimals: text.includes('.') ? (text.split('.')[1]?.replace(/\D/g, '').length || 0) : 0
        };
    };

    const animateCounter = element => {
        const original = element.textContent.trim();
        const target = parseTargetValue(original);
        if (!target) return;
        if (prefersReducedMotion.matches) {
            element.textContent = original;
            return;
        }

        const duration = 1100;
        const start = performance.now();

        const tick = now => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = (target.number * eased).toFixed(target.decimals);
            element.textContent = `${value}${target.suffix}`;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                element.textContent = original;
            }
        };

        requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
        stats.forEach(animateCounter);
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });

    stats.forEach(stat => observer.observe(stat));
}

function setupVisualParallax() {
    if (prefersReducedMotion.matches || window.innerWidth <= 980) return;

    const visuals = document.querySelectorAll('.visual-card img, .page-hero-visual img');
    if (!visuals.length) return;

    let ticking = false;

    const update = () => {
        visuals.forEach(image => {
            const rect = image.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;
            const elementCenter = rect.top + rect.height / 2;
            const offset = (elementCenter - viewportCenter) * -0.018;
            image.style.transform = `translate3d(0, ${clamp(offset, -10, 10)}px, 0) scale(1.04)`;
        });
        ticking = false;
    };

    const requestTick = () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    };

    update();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', debounce(requestTick, 120));
}

function setupContactForm() {
    const form = document.querySelector('.enquiry-form');
    if (!form) return;

    const storageKey = `jmg-form-draft-${window.location.pathname}`;
    restoreFormDraft(form, storageKey);

    form.addEventListener('input', debounce(() => {
        saveFormDraft(form, storageKey);
    }, 150));

    form.addEventListener('submit', event => handleFormSubmit(event, storageKey));
}

function clearErrors(form) {
    form.querySelectorAll('.error').forEach(error => error.remove());
    form.querySelectorAll('input, textarea').forEach(field => {
        field.style.borderColor = '';
    });
}

function addError(field, message) {
    field.style.borderColor = '#a43317';
    const error = document.createElement('span');
    error.className = 'error';
    error.textContent = message;
    field.insertAdjacentElement('afterend', error);
}

function validateForm(form) {
    clearErrors(form);

    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const phone = form.querySelector('#phone');
    const message = form.querySelector('#message');

    let valid = true;

    if (!name.value.trim()) {
        addError(name, 'Please enter your full name.');
        valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim() || !emailPattern.test(email.value.trim())) {
        addError(email, 'Please enter a valid email address.');
        valid = false;
    }

    if (phone.value.trim() && !/^[0-9+()\s-]{7,20}$/.test(phone.value.trim())) {
        addError(phone, 'Please enter a valid phone number.');
        valid = false;
    }

    if (!message.value.trim()) {
        addError(message, 'Please add a message before sending.');
        valid = false;
    }

    return valid;
}

function handleFormSubmit(event, storageKey) {
    event.preventDefault();
    const form = event.currentTarget;
    const successMessage = document.getElementById('thankYouMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!validateForm(form)) return;

    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
    })
        .then(response => {
            if (!response.ok) throw new Error('Form submission failed');
            form.reset();
            localStorage.removeItem(storageKey);
            if (successMessage) {
                successMessage.classList.remove('hidden');
                setTimeout(() => successMessage.classList.add('hidden'), 5000);
            }
        })
        .catch(() => {
            alert('There was a problem sending your enquiry. Please try again.');
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        });
}

function saveFormDraft(form, storageKey) {
    const payload = {};
    form.querySelectorAll('input, textarea').forEach(field => {
        if (field.name) {
            payload[field.name] = field.value;
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(payload));
}

function restoreFormDraft(form, storageKey) {
    try {
        const payload = JSON.parse(localStorage.getItem(storageKey) || '{}');
        Object.entries(payload).forEach(([name, value]) => {
            const field = form.querySelector(`[name="${CSS.escape(name)}"]`);
            if (field && typeof value === 'string') {
                field.value = value;
            }
        });
    } catch (error) {
        localStorage.removeItem(storageKey);
    }
}

function optimizeMediaLoading() {
    document.querySelectorAll('img').forEach(image => {
        image.decoding = 'async';
        if (!image.hasAttribute('loading')) {
            image.loading = 'lazy';
        }
    });
}

function debounce(callback, delay = 150) {
    let timeoutId;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delay);
    };
}

function throttleWithAnimationFrame(callback) {
    let running = false;
    return (...args) => {
        if (running) return;
        running = true;
        requestAnimationFrame(() => {
            callback(...args);
            running = false;
        });
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
