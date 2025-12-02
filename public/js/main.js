
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}


window.addEventListener('click', (e) => {
  const modals = document.getElementsByClassName('modal');
  for (let modal of modals) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('buscadorClientes');
  const cards = document.querySelectorAll('.client-card');

  if (input && cards.length > 0) {
    input.addEventListener('input', () => {
      const texto = input.value.toLowerCase();
      cards.forEach(card => {
        const nombre = card.getAttribute('data-nombre').toLowerCase();
        card.style.display = nombre.includes(texto) ? '' : 'none';
      });
    });
  }

  
  const formNuevoCliente = document.getElementById('formNuevoCliente');
  if (formNuevoCliente) {
    formNuevoCliente.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Cliente registrado (demo, sin guardar en BD)');
      closeModal('nuevoClienteModal');
    });
  }
});
