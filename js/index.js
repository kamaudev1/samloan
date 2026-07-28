// ============================================================
// SAM LOANS · MAIN JAVASCRIPT
// Mobile menu · Loan calculator · Smooth scroll · Active links
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    // ============================================================
    // 1. MOBILE MENU
    // ============================================================

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navButtons = document.querySelector('.nav-buttons');

    // ——— Add mobile buttons to nav-links (for mobile menu) ———
    if (navLinks && navButtons) {
        // Check if mobile-buttons already exist
        let mobileButtons = navLinks.querySelector('.mobile-buttons');

        if (!mobileButtons) {
            // Clone the nav buttons and wrap them in a div
            mobileButtons = document.createElement('div');
            mobileButtons.className = 'mobile-buttons';

            // Clone each button
            const buttons = navButtons.querySelectorAll('a');
            buttons.forEach(btn => {
                const clone = btn.cloneNode(true);
                mobileButtons.appendChild(clone);
            });

            // Append to nav-links
            navLinks.appendChild(mobileButtons);
        }
    }

    // ——— Toggle menu ———
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');

            // Toggle icon
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }

            // Toggle body scroll lock
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        // ——— Close menu when clicking a link ———
        const allLinks = navLinks.querySelectorAll('a');
        allLinks.forEach(link => {
            link.addEventListener('click', function() {
                navLinks.classList.remove('active');
                document.body.style.overflow = '';

                // Reset icon
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });

        // ——— Close menu when clicking outside ———
        document.addEventListener('click', function(e) {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';

                    const icon = menuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            }
        });

        // ——— Close menu on Escape key ———
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                document.body.style.overflow = '';

                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // ============================================================
    // 2. LOAN CALCULATOR
    // ============================================================

    const calculateBtn = document.getElementById('calculateBtn');
    const amountInput = document.getElementById('amount');
    const interestInput = document.getElementById('interest');
    const monthsInput = document.getElementById('months');
    const resultEl = document.getElementById('result');

    if (calculateBtn && amountInput && interestInput && monthsInput && resultEl) {

        // ——— Calculate function ———
        function calculateLoan() {
            // Trim and parse values
            const amount = parseFloat(amountInput.value.trim());
            const interest = parseFloat(interestInput.value.trim());
            const months = parseInt(monthsInput.value.trim());

            // --- Validation ---
            // Check if any field is empty or NaN
            if (isNaN(amount) || amountInput.value.trim() === '') {
                resultEl.textContent = '⚠️ Please enter the loan amount.';
                resultEl.style.color = '#f59e0b';
                return;
            }

            if (isNaN(interest) || interestInput.value.trim() === '') {
                resultEl.textContent = '⚠️ Please enter the interest rate.';
                resultEl.style.color = '#f59e0b';
                return;
            }

            if (isNaN(months) || monthsInput.value.trim() === '') {
                resultEl.textContent = '⚠️ Please enter the number of months.';
                resultEl.style.color = '#f59e0b';
                return;
            }

            // Check for invalid values
            if (amount <= 0) {
                resultEl.textContent = '❌ Loan amount must be greater than 0.';
                resultEl.style.color = '#ef4444';
                return;
            }

            if (interest < 0) {
                resultEl.textContent = '❌ Interest rate cannot be negative.';
                resultEl.style.color = '#ef4444';
                return;
            }

            if (months <= 0) {
                resultEl.textContent = '❌ Number of months must be greater than 0.';
                resultEl.style.color = '#ef4444';
                return;
            }

            if (!Number.isInteger(months)) {
                resultEl.textContent = '❌ Number of months must be a whole number.';
                resultEl.style.color = '#ef4444';
                return;
            }

            // --- Calculate ---
            const monthlyRate = (interest / 100) / 12;
            let payment;

            if (monthlyRate === 0) {
                // If interest is 0%, simple division
                payment = amount / months;
            } else {
                // Standard loan payment formula
                payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
            }

            // --- Display result ---
            const formattedPayment = payment.toFixed(2);
            resultEl.textContent = `💰 Monthly Payment: KES ${formattedPayment}`;
            resultEl.style.color = '#a78bfa';

            // --- Animate result ---
            resultEl.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease';
            resultEl.style.transform = 'scale(1.08)';
            setTimeout(() => {
                resultEl.style.transform = 'scale(1)';
            }, 300);
        }

        // ——— Event listeners ———
        calculateBtn.addEventListener('click', calculateLoan);

        // Allow Enter key on any input to trigger calculation
        [amountInput, interestInput, monthsInput].forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateBtn.click();
                }
            });

            // Clear error state on focus
            input.addEventListener('focus', function() {
                if (resultEl.style.color !== '#a78bfa') {
                    resultEl.textContent = '💡 Enter values and click Calculate';
                    resultEl.style.color = 'rgba(255,255,255,0.4)';
                }
            });
        });

        // Initial placeholder message
        if (resultEl.textContent === 'Monthly Payment: -' || resultEl.textContent === '') {
            resultEl.textContent = '💡 Enter values and click Calculate';
            resultEl.style.color = 'rgba(255,255,255,0.4)';
            resultEl.style.fontWeight = '400';
        }
    }

    // ============================================================
    // 3. SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Update URL without jumping
                history.pushState(null, null, targetId);
            }
        });
    });

    // ============================================================
    // 4. ACTIVE NAV LINK HIGHLIGHT ON SCROLL
    // ============================================================

    const sections = document.querySelectorAll('section[id]');
    const navLinkElements = document.querySelectorAll('.nav-links > a[href^="#"]');

    if (sections.length > 0 && navLinkElements.length > 0) {
        let isScrolling = false;

        window.addEventListener('scroll', function() {
            if (!isScrolling) {
                window.requestAnimationFrame(function() {
                    let current = '';
                    const scrollY = window.pageYOffset;

                    sections.forEach(section => {
                        const sectionTop = section.offsetTop - 100;
                        const sectionBottom = sectionTop + section.offsetHeight;

                        if (scrollY >= sectionTop && scrollY < sectionBottom) {
                            current = section.getAttribute('id');
                        }
                    });

                    navLinkElements.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${current}`) {
                            link.classList.add('active');
                        }
                    });

                    isScrolling = false;
                });
                isScrolling = true;
            }
        }, { passive: true });

        // Also highlight on page load
        setTimeout(() => {
            window.dispatchEvent(new Event('scroll'));
        }, 100);
    }

    // ============================================================
    // 5. ADD ACTIVE LINK STYLES (if not in CSS)
    // ============================================================

    // Inject active link styles if they don't exist
    const styleCheck = document.querySelector('style[data-nav-active]');
    if (!styleCheck) {
        const style = document.createElement('style');
        style.setAttribute('data-nav-active', 'true');
        style.textContent = `
            .nav-links > a.active {
                color: #fff !important;
            }
            .nav-links > a.active::after {
                width: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // 6. RESIZE HANDLER — close menu on window resize
    // ============================================================

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 768 && navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                document.body.style.overflow = '';

                const icon = menuToggle?.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        }, 250);
    });

    // ============================================================
    // 7. KEYBOARD ACCESSIBILITY — focus trap for mobile menu
    // ============================================================

    if (navLinks) {
        const focusableElements = navLinks.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex="0"]'
        );

        navLinks.addEventListener('keydown', function(e) {
            if (!this.classList.contains('active')) return;

            const focusable = Array.from(focusableElements);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // ============================================================
    // 8. CONSOLE WELCOME
    // ============================================================

    console.log('%c✨ Sam Loans', 'font-size:24px; font-weight:700; color:#a78bfa;');
    console.log('%cFast · Secure · Reliable', 'font-size:14px; color:#6b7280;');
    console.log('💡 Built with ❤️');

});

// ============================================================
// END OF FILE
// ============================================================
