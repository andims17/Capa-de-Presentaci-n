// 🚀 VetPos - JavaScript Interactivo
// Sistema moderno para clínica veterinaria

document.addEventListener('DOMContentLoaded', function () {
    console.log('🐾 VetPos Sistema Cargado Correctamente');

    // ✨ Inicializar animaciones y efectos
    initializeAnimations();
    initializeInteractiveElements();
    initializeTooltips();

    // 🎯 Marcar enlace activo en navegación
    markActiveNavigation();

    // 📱 Efectos responsive
    handleResponsiveEffects();
});

// 🎨 Inicializar animaciones
function initializeAnimations() {
    // Animación de entrada para cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });

    // Animación para botones
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });

        button.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// 🎯 Elementos interactivos
function initializeInteractiveElements() {
    // Efecto ripple en botones
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });

    // Hover effect en cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = '0 15px 35px rgba(0, 191, 255, 0.3)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 2px 10px rgba(0, 191, 255, 0.1)';
        });
    });

    // Animación en filas de tabla
    const tableRows = document.querySelectorAll('.table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function () {
            this.style.transform = 'scale(1.02)';
            this.style.backgroundColor = '#E6F3FF';
        });

        row.addEventListener('mouseleave', function () {
            this.style.transform = 'scale(1)';
            this.style.backgroundColor = '';
        });
    });
}

// 🎪 Efecto ripple para botones
function createRippleEffect(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    // Agregar estilos CSS para el ripple
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple-animation 0.6s linear';
    ripple.style.pointerEvents = 'none';

    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// 🧭 Marcar navegación activa
function markActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.enlace-navegacion');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.includes(href) || (currentPath === '/' && href.includes('PanelPrincipal'))) {
            link.classList.add('activo');

            // Efecto especial para el enlace activo
            link.style.background = 'linear-gradient(135deg, #E6F3FF, #FFFFFF)';
            link.style.color = '#1E90FF';
            link.style.borderBottomColor = '#00BFFF';
        }
    });
}

// 💡 Tooltips informativos
function initializeTooltips() {
    // Crear tooltips para iconos
    const icons = document.querySelectorAll('.enlace-navegacion i');
    icons.forEach(icon => {
        const parentLink = icon.closest('.enlace-navegacion');
        const text = parentLink.querySelector('span').textContent;

        icon.setAttribute('title', text);
        icon.style.cursor = 'help';
    });

    // Tooltips para botones de acción
    const actionButtons = document.querySelectorAll('.btn');
    actionButtons.forEach(button => {
        if (!button.getAttribute('title')) {
            const text = button.textContent.trim();
            button.setAttribute('title', `Clic para: ${text}`);
        }
    });
}

// 📱 Efectos responsive
function handleResponsiveEffects() {
    function checkScreenSize() {
        const isMobile = window.innerWidth <= 768;
        const cards = document.querySelectorAll('.card');

        if (isMobile) {
            // Reducir efectos en móvil para mejor rendimiento
            cards.forEach(card => {
                card.style.transition = 'all 0.2s ease';
            });
        } else {
            // Efectos completos en desktop
            cards.forEach(card => {
                card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        }
    }

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
}

// 🎯 Funciones utilitarias
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification-popup`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 191, 255, 0.2);
        animation: slideInRight 0.5s ease-out;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// 🔄 Función para recargar datos (ejemplo)
function refreshData() {
    showNotification('🔄 Actualizando datos...', 'info');

    // Simular carga
    setTimeout(() => {
        showNotification('✅ Datos actualizados correctamente', 'success');
    }, 1500);
}

// 📊 Animaciones para números/estadísticas
function animateNumbers() {
    const numbers = document.querySelectorAll('.h5.mb-0.font-weight-bold');

    numbers.forEach(number => {
        const finalValue = parseInt(number.textContent.replace(/[^0-9]/g, '')) || 0;
        let currentValue = 0;
        const increment = Math.ceil(finalValue / 50);

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(timer);
            }

            const prefix = number.textContent.includes('$') ? '$' : '';
            number.textContent = prefix + currentValue.toLocaleString();
        }, 30);
    });
}

// 🎨 Agregar estilos CSS dinámicos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    .notification-popup {
        animation: slideInRight 0.5s ease-out;
    }
`;
document.head.appendChild(style);

// 🚀 Inicializar animación de números cuando sea visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNumbers();
            observer.disconnect();
        }
    });
});

const statsSection = document.querySelector('.row.mb-4');
if (statsSection) {
    observer.observe(statsSection);
}

console.log('🎉 VetPos JavaScript completamente cargado - Sistema listo!');