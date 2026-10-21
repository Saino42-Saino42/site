    function openModal(id) {
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        const content = document.getElementById(id).innerHTML;

        // Сброс скролла до вставки нового контента
        if (modalContent) modalContent.scrollTop = 0;

        document.getElementById('modal-body').innerHTML = content;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Дополнительный сброс после отрисовки контента
        requestAnimationFrame(() => {
            if (modalContent) modalContent.scrollTop = 0;
        });
    }

    function closeModal(event) {
        if (event) event.stopPropagation();
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');

        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Сброс скролла и при закрытии — на всякий случай
        if (modalContent) modalContent.scrollTop = 0;
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

document.addEventListener('DOMContentLoaded', function () {
    var m = document.getElementById('modal');
    if (m) { m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); }
    var id = location.hash.slice(1);
    if (/^img[1-5]$/.test(id) && document.getElementById(id)) openModal(id);
});
