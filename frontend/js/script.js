document.addEventListener("DOMContentLoaded", () => {

    // === МОДАЛЬНОЕ ОКНО ДЛЯ КАРТОЧЕК РЕШЕНИЙ ===
    const solutionCards = document.querySelectorAll(".solution-card");
    const solutionModal = document.getElementById("solutionModal");
    const solutionModalClose = document.querySelector(".solution-modal-close");
    const solutionModalOverlay = document.querySelector(".solution-modal-overlay");
    const solutionModalTitle = document.getElementById("solutionModalTitle");
    const solutionModalDesc = document.getElementById("solutionModalDesc");
    const solutionImagesContainer = document.querySelector('.solution-modal-images');

    if (solutionCards.length && solutionModal) {
        // Открытие модалки при клике на карточку
        solutionCards.forEach(card => {
            card.addEventListener("click", () => {
                const title = card.dataset.title;
                const desc = card.dataset.desc;

                solutionModalTitle.textContent = title;
                solutionModalDesc.textContent = desc;

                // Заполняем миниатюры из data-images
                if (solutionImagesContainer) {
                    solutionImagesContainer.innerHTML = '';

                    const images = (card.dataset.images || '').split(',').map(s => s.trim()).filter(Boolean);

                    images.forEach((src, idx) => {
                        const wrap = document.createElement('div');
                        wrap.className = 'solution-modal-image-wrapper';

                        const img = document.createElement('img');
                        img.className = 'solution-modal-image';
                        img.src = src;
                        img.alt = `${title} фото ${idx + 1}`;

                        // При клике на миниатюру открываем основной модал с галереей
                        img.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const list = images.map((u, i) => ({ url: u, caption: `${title} — фото ${i+1}` }));
                            openModalWithList(list, idx);
                        });

                        wrap.appendChild(img);
                        solutionImagesContainer.appendChild(wrap);
                    });
                }

                solutionModal.classList.add("show");
                document.body.style.overflow = "hidden";
            });
        });

        // Закрытие по крестику
        if (solutionModalClose) {
            solutionModalClose.addEventListener("click", closeSolutionModal);
        }

        // Закрытие по клику на фон
        if (solutionModalOverlay) {
            solutionModalOverlay.addEventListener("click", closeSolutionModal);
        }

        function closeSolutionModal() {
            // Добавляем класс для анимации закрытия (длительность 0.3s)
            solutionModal.classList.add("closing");
            
            // Через 0.3s удаляем модалку из DOM и возвращаем скролл
            setTimeout(() => {
                solutionModal.classList.remove("show");
                solutionModal.classList.remove("closing");
                document.body.style.overflow = "auto";
            }, 300);
        }

        // Закрытие по Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && solutionModal.classList.contains("show")) {
                closeSolutionModal();
            }
        });
    }

    // === УНИВЕРСАЛЬНАЯ АНИМАЦИЯ ПОЯВЛЕНИЯ ===
    function observeElements(selector, threshold = 0.2, rootMargin = '0px') {
        const elements = document.querySelectorAll(selector);
        if (!elements.length) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold, rootMargin });

        elements.forEach(el => observer.observe(el));
    }

    // Анимация секций
    observeElements('.solutions, .trust, .workflow-premium, .works', 0.1);

    // Анимация карточек решений
    observeElements('.solution-card', 0.2, '0px 0px -50px 0px');

    // Анимация карточек работ
    observeElements('.work-card', 0.15);

    // Анимация элементов с data-animate
    observeElements('[data-animate]', 0.2);

    // === АНИМАЦИЯ ШАГОВ ===
    observeElements('.workflow-step', 0.2);

    // === АНИМАЦИЯ КАРТОЧЕК "НАМ ДОВЕРЯЮТ" ===
    observeElements('.trust-logo-card', 0.2);



    // === МОДАЛКА ДЛЯ "НАШИ РАБОТЫ" И ОБЩАЯ ГАЛЕРЕЯ ===
    const galleryCards = document.querySelectorAll(".work-card .work-image");
    const modal = document.getElementById("modal");
    const modalImage = document.getElementById("modal-image");
    const modalCaption = document.getElementById("modal-caption");
    const modalClose = document.querySelector(".modal-close");
    const prevBtn = document.querySelector(".modal-prev");
    const nextBtn = document.querySelector(".modal-next");

    // Список изображений, который сейчас открыт в модалке (массив {url, caption})
    let modalImageList = [];
    let modalImageIndex = 0;

    function openModalWithList(list, index) {
        if (!modal || !modalImage) return;

        modalImageList = list || [];
        modalImageIndex = Math.max(0, Math.min(index || 0, modalImageList.length - 1));

        if (!modalImageList.length) return;

        modalImage.src = modalImageList[modalImageIndex].url;
        modalCaption.textContent = modalImageList[modalImageIndex].caption || '';

        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => { if (modal) modal.style.display = 'none'; }, 300);
    }

    function updateModal() {
        if (!modalImageList.length) return;

        modalImage.style.opacity = '0';
        modalCaption.style.opacity = '0';

        setTimeout(() => {
            const item = modalImageList[modalImageIndex];
            modalImage.src = item.url;
            modalCaption.textContent = item.caption || '';
            modalImage.style.opacity = '1';
            modalCaption.style.opacity = '1';
        }, 200);
    }

    if (modal && modalImage && modalClose) {
        // Открытие модалки из сетки работ. Формируем список из всех фоновых изображений.
        if (galleryCards.length) {
            galleryCards.forEach((imageEl, index) => {
                imageEl.addEventListener('click', () => {
                    const bg = imageEl.style.backgroundImage;
                    if (!bg || bg === 'none') return;
                    const url = bg.slice(5, -2);

                    // Формируем список всех доступных работ
                    const list = [];
                    galleryCards.forEach((imgEl, i) => {
                        const bg2 = imgEl.style.backgroundImage;
                        if (!bg2 || bg2 === 'none') return;
                        const u = bg2.slice(5, -2);
                        list.push({ url: u, caption: imgEl.dataset.caption || `Работа №${i+1}` });
                    });

                    openModalWithList(list, index);
                });
            });
        }

        // Закрытие по крестику
        modalClose.addEventListener('click', closeModal);

        // Закрытие по фону
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        // Навигация
        if (nextBtn) nextBtn.addEventListener('click', () => { if (!modalImageList.length) return; modalImageIndex = (modalImageIndex + 1) % modalImageList.length; updateModal(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { if (!modalImageList.length) return; modalImageIndex = (modalImageIndex - 1 + modalImageList.length) % modalImageList.length; updateModal(); });

        // Клавиши
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('show')) return;
            if (e.key === 'ArrowRight') { modalImageIndex = (modalImageIndex + 1) % modalImageList.length; updateModal(); }
            if (e.key === 'ArrowLeft') { modalImageIndex = (modalImageIndex - 1 + modalImageList.length) % modalImageList.length; updateModal(); }
            if (e.key === 'Escape') closeModal();
        });
    }
// === БУРГЕР-МЕНЮ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ ===
const burger = document.querySelector('.burger');
const mobileNav = document.querySelector('.mobile-nav');

if (burger && mobileNav) {
    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        mobileNav.classList.toggle('active');
    });
}

// === ЗАКРЫТИЕ МЕНЮ ПРИ КЛИКЕ НА ЛЮБУЮ ССЫЛКУ ===
document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
        burger.classList.remove('active');
        mobileNav.classList.remove('active');
    });
});

// === ЗАКРЫТИЕ МЕНЮ ПРИ КЛИКЕ ВНЕ ЕГО ===
document.addEventListener('click', (e) => {
    const clickInsideMenu = mobileNav.contains(e.target);
    const clickOnBurger = burger.contains(e.target);

    if (mobileNav.classList.contains('active') && !clickInsideMenu && !clickOnBurger) {
        mobileNav.classList.remove('active');
        burger.classList.remove('active');
    }
});

});

// ============================
// НОВЫЕ ФУНКЦИИ 2024
// ============================

// Прогресс-бар скролла
const scrollProgress = document.querySelector('.scroll-progress');
if (scrollProgress) {
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollProgress.style.width = scrollPercent + '%';
    });
}

// Кнопка наверх
const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Анимированные счетчики Stats
const statItems = document.querySelectorAll('.stat-item');
const statsSection = document.querySelector('.stats-section');

function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

if (statsSection && statItems.length) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                statItems.forEach(item => {
                    const target = parseInt(item.dataset.count);
                    const numberEl = item.querySelector('.stat-number');
                    if (numberEl && target) {
                        animateCounter(numberEl, target);
                    }
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statsObserver.observe(statsSection);
}

// Анимация появления для новых секций
function observeElements(selector, threshold = 0.2, rootMargin = '0px') {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold, rootMargin });

    elements.forEach(el => observer.observe(el));
}

observeElements('.stat-item', 0.2);
observeElements('.why-us-card', 0.1, '0px 0px -50px 0px');
observeElements('.faq-item', 0.1, '0px 0px -30px 0px');

// Карусель отзывов
const testimonialCards = document.querySelectorAll('.testimonial-card');
const testimonialDots = document.querySelectorAll('.testimonials-dots .dot');
const prevBtn = document.querySelector('.testimonial-prev');
const nextBtn = document.querySelector('.testimonial-next');

let currentTestimonial = 0;

function showTestimonial(index) {
    testimonialCards.forEach((card, i) => {
        card.classList.remove('active');
        testimonialDots[i]?.classList.remove('active');
    });
    
    testimonialCards[index]?.classList.add('active');
    testimonialDots[index]?.classList.add('active');
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
        showTestimonial(currentTestimonial);
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentTestimonial = (currentTestimonial - 1 + testimonialCards.length) % testimonialCards.length;
        showTestimonial(currentTestimonial);
    });
}

testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentTestimonial = index;
        showTestimonial(currentTestimonial);
    });
});

// Автопрокрутка отзывов
setInterval(() => {
    if (testimonialCards.length > 0) {
        currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
        showTestimonial(currentTestimonial);
    }
}, 6000);

// FAQ Аккордеон
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question?.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Закрываем все
        faqItems.forEach(i => i.classList.remove('active'));
        
        // Открываем текущий если он был закрыт
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Particle эффект в hero
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(255, 107, 0, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particle ${Math.random() * 20 + 10}s infinite linear;
            animation-delay: ${Math.random() * 5}s;
            pointer-events: none;
        `;
        container.appendChild(particle);
    }
}

createParticles();

// Боковые плавающие частицы
function createSideParticles() {
    const leftSide = document.createElement('div');
    leftSide.className = 'side-particles left';
    const rightSide = document.createElement('div');
    rightSide.className = 'side-particles right';
    
    document.body.appendChild(leftSide);
    document.body.appendChild(rightSide);
    
    // Создаем частицы для левой стороны
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'side-dot';
        dot.style.top = `${20 + i * 18}%`;
        dot.style.animationDelay = `${i * 0.8}s`;
        dot.style.animationDuration = `${12 + i * 2}s`;
        leftSide.appendChild(dot);
    }
    
    // Создаем частицы для правой стороны
    for (let i = 0; i < 5; i++) {
        const dot = document.createElement('div');
        dot.className = 'side-dot';
        dot.style.top = `${15 + i * 16}%`;
        dot.style.animationDelay = `${i * 0.6 + 0.3}s`;
        dot.style.animationDuration = `${14 + i * 1.5}s`;
        rightSide.appendChild(dot);
    }
}

createSideParticles();

// Magnetic button effect
const magneticBtns = document.querySelectorAll('.magnetic-btn');

magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
    });
});

// Премиальные hover-эффекты для карточек решений
const solutionCardsHover = document.querySelectorAll('.solution-card');

solutionCardsHover.forEach(card => {
    // Плавное появление тени при наведении
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    });
});
