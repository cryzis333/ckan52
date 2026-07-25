document.addEventListener("DOMContentLoaded", () => {

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

    // Анимация секции контактов
    observeElements('.contact-page', 0.1);

    // Анимация колонок
    observeElements('.contact-info, .contact-form', 0.2);

    // Анимация заголовков
    observeElements('.contact-title, .contact-subtitle', 0.2);

    // === БУРГЕР + МОБИЛЬНОЕ МЕНЮ ===
    const burger = document.querySelector('.burger');
    const mobileNav = document.querySelector('.mobile-nav');

    if (burger && mobileNav) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
    }

    document.querySelectorAll('.mobile-nav a').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            mobileNav.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!mobileNav.classList.contains('active')) return;

        const clickInsideMenu = mobileNav.contains(e.target);
        const clickOnBurger = burger.contains(e.target);

        if (!clickInsideMenu && !clickOnBurger) {
            mobileNav.classList.remove('active');
            burger.classList.remove('active');
        }
    });

    // === УМНЫЕ КОНТАКТЫ ===
    document.querySelectorAll('.contact-link').forEach(link => {
        link.addEventListener('click', function (e) {

            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

            if (isMobile) return;

            e.preventDefault();

            const text = this.dataset.copy;

            navigator.clipboard.writeText(text).then(() => {
                showAlert(`Скопировано: ${text}`, "success");
            });

            // Если это телефон - показываем блок с ответом для телефона
            if (this.href.includes('tel:')) {
                const responseBlock = document.getElementById('contactNumberResponse');
                if (responseBlock) {
                    responseBlock.classList.add('show');
                }
            }

            // Если это почта - показываем блок с ответом для почты
            if (this.href.includes('mailto:')) {
                const responseBlock = document.getElementById('contactMailResponse');
                if (responseBlock) {
                    responseBlock.classList.add('show');
                }
            }
        });
    });

    // === ВАЛИДАЦИЯ ФОРМЫ ===
    const form = document.querySelector(".contact-form");
    const phoneInput = form.querySelector("input[type='tel']");
    const fileInput = document.getElementById("fileInput");
    const fileNameSpan = document.getElementById("fileName");
    const fileDropZone = document.getElementById("fileDropZone");
    const honeypot = document.getElementById("email2");

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    maskPhone(phoneInput);

    phoneInput.addEventListener("focus", () => {
        if (phoneInput.value.trim() === "") {
            phoneInput.value = "+7 (";
        }
    });

    // === ОБРАБОТКА ВЫБОРА ФАЙЛА ===
    if (fileInput) {
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length === 0) {
                fileNameSpan.textContent = "Файл не выбран";
                removePreview();
                return;
            }

            const file = fileInput.files[0];

            if (file.size > MAX_FILE_SIZE) {
                showAlert("Файл слишком большой (максимум 5 МБ)", "error");
                fileInput.value = "";
                fileNameSpan.textContent = "Файл не выбран";
                removePreview();
                return;
            }

            fileNameSpan.textContent = file.name;
            showImagePreview(file);
        });
    }

    // === DRAG & DROP ===
    if (fileDropZone) {
        ["dragenter", "dragover"].forEach(eventName => {
            fileDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDropZone.classList.add("dragover");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            fileDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDropZone.classList.remove("dragover");
            });
        });

        fileDropZone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (!files || files.length === 0) return;

            const file = files[0];

            if (file.size > MAX_FILE_SIZE) {
                showAlert("Файл слишком большой (максимум 5 МБ)", "error");
                return;
            }

            fileInput.files = files;
            fileNameSpan.textContent = file.name;
            showImagePreview(file);
        });
    }

    // === ОТПРАВКА ФОРМЫ ===
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const nameInput = this.querySelector("input[name='name']");
        const msgInput = this.querySelector("textarea[name='message']");

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const msg = msgInput.value.trim();

        // === ВАЛИДАЦИЯ ===
        if (!validateName(name)) {
            showAlert("Введите корректное имя", "error");
            markError(nameInput);
            return;
        } else markSuccess(nameInput);

        if (!validatePhone(phone)) {
            showAlert("Введите корректный номер телефона", "error");
            markError(phoneInput);
            return;
        } else markSuccess(phoneInput);

        if (!validateMessage(msg)) {
            showAlert("Комментарий слишком длинный", "error");
            markError(msgInput);
            return;
        } else markSuccess(msgInput);

        // === ОТПРАВКА ТЕКСТА + ФАЙЛОВ ===

        const recaptchaEl = document.querySelector("textarea[name='g-recaptcha-response']");
        const recaptchaToken = recaptchaEl ? recaptchaEl.value.trim() : "";
        
        if (!recaptchaToken) {
            showAlert("Подтвердите, что вы не робот", "error");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("phone", phone);
        formData.append("message", msg);
        if (honeypot) formData.append("email2", honeypot.value || "");
        formData.append("g-recaptcha-response", recaptchaToken);

        if (fileInput && fileInput.files.length > 0) {
            for (let file of fileInput.files) {
                formData.append("files", file);
            }
        }

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!data.ok) {
                showAlert("Ошибка при отправке", "error");
                return;
            }
        } catch (err) {
            showAlert("Сервер недоступен", "error");
            return;
        }

        showAlert("Заявка отправлена", "success");

        // Показываем блок с ответом для формы
        const formResponseBlock = document.getElementById('contactFormResponse');
        if (formResponseBlock) {
            formResponseBlock.classList.add('show');
        }

        if (window.grecaptcha && typeof grecaptcha.reset === 'function') {
            try { grecaptcha.reset(); } catch (e) { }
        }

        form.reset();
        fileNameSpan.textContent = "Файл не выбран";
        removePreview();
    });

});

function validateName(name) {
    if (name.length < 2 || name.length > 40) return false;
    return /^[A-Za-zА-Яа-яЁё\s\-]+$/.test(name);
}

function validatePhone(phone) {
    return /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone);
}

function validateMessage(msg) {
    return msg.length <= 2000;
}

function showAlert(text, type = "success") {
    let box = document.querySelector(".alert-box");

    if (!box) {
        box = document.createElement("div");
        box.className = "alert-box";
        document.body.appendChild(box);
    }

    box.textContent = text;
    box.style.background = type === "error" ? "#ff4d4d" : "#4cc9a7";

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 5000);
}

function markError(input) {
    input.classList.remove("input-success");
    input.classList.add("input-error");
    setTimeout(() => input.classList.remove("input-error"), 5000);
}

function markSuccess(input) {
    input.classList.remove("input-error");
    input.classList.add("input-success");
    setTimeout(() => input.classList.remove("input-success"), 5000);
}

function maskPhone(input) {
    let lastValue = "";
    
    input.addEventListener("input", (e) => {
        let v = input.value.replace(/\D/g, "");
        
        // Если пользователь удаляет символы, позволяем это делать
        if (input.value.length < lastValue.length) {
            lastValue = input.value;
            return;
        }
        
        if (v.startsWith("8")) v = "7" + v.slice(1);
        v = v.replace(/^7?/, "7");

        let formatted = "+7 (";

        if (v.length > 1) formatted += v.substring(1, 4);
        if (v.length >= 4) formatted += ") " + v.substring(4, 7);
        if (v.length >= 7) formatted += "-" + v.substring(7, 9);
        if (v.length >= 9) formatted += "-" + v.substring(9, 11);

        input.value = formatted;
        lastValue = formatted;
    });
    
    // Обработка клавиши Backspace для корректного удаления
    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
            const cursorPos = input.selectionStart;
            const value = input.value;
            
            // Если курсор в конце и перед ним символы форматирования, удаляем их
            if (cursorPos === value.length && cursorPos > 0) {
                let newPos = cursorPos;
                
                // Пропускаем символы форматирования при удалении
                if (value[cursorPos - 1] === ")" || value[cursorPos - 1] === "-" || value[cursorPos - 1] === " ") {
                    while (newPos > 0 && (value[newPos - 1] === ")" || value[newPos - 1] === "-" || value[newPos - 1] === " ")) {
                        newPos--;
                    }
                    newPos--; // еще один шаг для удаления цифры
                }
                
                if (newPos < cursorPos) {
                    e.preventDefault();
                    input.value = value.substring(0, newPos) + value.substring(cursorPos);
                    input.setSelectionRange(newPos, newPos);
                    lastValue = input.value;
                }
            }
        }
    });
}

function showImagePreview(file) {
    if (!file.type.startsWith("image/")) {
        removePreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        let preview = document.querySelector(".file-preview");
        if (!preview) {
            preview = document.createElement("img");
            preview.className = "file-preview";
            document.getElementById("fileDropZone").appendChild(preview);
        }
        preview.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function removePreview() {
    const preview = document.querySelector(".file-preview");
    if (preview) preview.remove();
}
