const toast = document.querySelector('#toast');
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

const filters = document.querySelectorAll('[data-filter]');
const rows = document.querySelectorAll('#cardRows tr');
function setFilter(filter) {
  rows.forEach(row => row.hidden = filter !== 'all' && row.dataset.kind !== filter);
  document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  document.querySelector('#cards').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));

document.querySelector('#refreshPrices').addEventListener('click', event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.innerHTML = '↻ <span>Checking eBay sales…</span>';
  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = '↻ <span>Refresh prices</span>';
    notify('Demo price scan complete. 12 cards need review.');
  }, 850);
});

document.querySelector('#managePlan').addEventListener('click', () => notify('Plan management will open Shopify billing once the app is connected.'));
document.querySelector('#viewAll').addEventListener('click', () => setFilter('all'));
const dialog = document.querySelector('#reviewDialog');
document.querySelectorAll('.row-action').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#dialogTitle').textContent = button.dataset.name;
  dialog.showModal();
}));
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('.close-primary').addEventListener('click', () => dialog.close());
