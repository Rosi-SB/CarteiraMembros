// public/js/main.js

document.addEventListener('DOMContentLoaded', function() {
  // Efeito de confirmação ao enviar formulários
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function() {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
        
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 10000); // Timeout de segurança
      }
    });
  });
  
  // Alerta para botões desativados
  const disabledButtons = document.querySelectorAll('button[disabled]');
  disabledButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Por favor, complete os passos anteriores antes de gerar as carteirinhas.');
    });
  });
});
