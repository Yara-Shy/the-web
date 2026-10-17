export function mount(section) {
  const button = section.querySelector('#copyEmail');
  const label  = section.querySelector('#emailText');
  const email  = label.textContent.trim();

  button.addEventListener('click', () => {
    navigator.clipboard.writeText(email).then(() => {
      label.textContent = 'copied!';
      setTimeout(() => { label.textContent = email; }, 2000);
    }).catch(() => {
      label.textContent = email;
    });
  });
}
