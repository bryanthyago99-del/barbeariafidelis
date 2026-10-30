document.addEventListener('DOMContentLoaded', () => {
  const calendarContainer = document.getElementById('calendar-days');

  if (calendarContainer) {
    initCalendarBooking();
    return;
  }

  initLegacyBooking();
});

function initCalendarBooking() {
  const form = document.getElementById('agenda-form');
  const calendarTitle = document.getElementById('calendar-title');
  const calendarDays = document.getElementById('calendar-days');
  const timeGrid = document.getElementById('time-grid');
  const selectedDateLabel = document.getElementById('selected-date-label');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const statusBox = document.getElementById('form-status');

  const state = {
    currentDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: '',
    selectedTime: '',
  };

  if (!form || !calendarTitle || !calendarDays || !timeGrid || !selectedDateLabel || !prevMonthBtn || !nextMonthBtn) {
    return;
  }

  function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateString) {
    if (!dateString) return 'Selecione um dia';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  function updateStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.classList.toggle('error', isError);
    statusBox.classList.toggle('success', !isError);
  }

  function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    calendarTitle.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));

    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());

    const cells = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + i);
      const isCurrentMonth = cellDate.getMonth() === month;
      const isPast = cellDate < today;
      const iso = formatIsoDate(cellDate);
      const isSelected = state.selectedDate === iso;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      if (!isCurrentMonth) button.classList.add('muted');
      if (isPast) button.classList.add('disabled');
      if (isSelected) button.classList.add('selected');

      button.textContent = String(cellDate.getDate());
      button.disabled = isPast || !isCurrentMonth;
      button.setAttribute('aria-label', `Selecionar dia ${formatDisplayDate(iso)}`);

      button.addEventListener('click', () => {
        state.selectedDate = iso;
        state.selectedTime = '';
        renderCalendar();
        loadAvailableTimes();
      });

      cells.push(button);
    }

    calendarDays.innerHTML = '';
    cells.forEach((cell) => calendarDays.appendChild(cell));
  }

  async function loadAvailableTimes() {
    if (!state.selectedDate) {
      timeGrid.innerHTML = '<div class="time-empty">Selecione um dia do calendário</div>';
      selectedDateLabel.textContent = 'Selecione um dia';
      return;
    }

    selectedDateLabel.textContent = formatDisplayDate(state.selectedDate);
    timeGrid.innerHTML = '<div class="time-empty">Carregando horários...</div>';

    try {
      const response = await fetch(`/api/horarios?data=${state.selectedDate}`);
      const payload = await response.json();

      if (!response.ok || !payload.horarios) {
        throw new Error(payload?.error || 'Erro ao carregar horários');
      }

      const slots = payload.horarios;

      if (!slots.length) {
        timeGrid.innerHTML = '<div class="time-empty">Nenhum horário disponível para esta data.</div>';
        return;
      }

      timeGrid.innerHTML = '';

      slots.forEach((slot) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot';
        button.textContent = slot.horario;

        if (!slot.disponivel) {
          button.classList.add('ocupado');
          button.disabled = true;
        } else {
          button.classList.add('disponivel');
          if (state.selectedTime === slot.horario) button.classList.add('selected');
          button.addEventListener('click', () => {
            state.selectedTime = slot.horario;
            renderTimeSlots(slots);
          });
        }

        timeGrid.appendChild(button);
      });
    } catch (error) {
      timeGrid.innerHTML = '<div class="time-empty">Não foi possível carregar os horários.</div>';
      updateStatus(error.message, true);
    }
  }

  function renderTimeSlots(slots) {
    timeGrid.innerHTML = '';

    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      button.textContent = slot.horario;

      if (!slot.disponivel) {
        button.classList.add('ocupado');
        button.disabled = true;
      } else {
        button.classList.add('disponivel');
        if (state.selectedTime === slot.horario) button.classList.add('selected');
        button.addEventListener('click', () => {
          state.selectedTime = slot.horario;
          renderTimeSlots(slots);
        });
      }

      timeGrid.appendChild(button);
    });
  }

  prevMonthBtn.addEventListener('click', () => {
    state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1, 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 1);
    renderCalendar();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = document.getElementById('nome')?.value.trim();
    const whatsapp = document.getElementById('whatsapp')?.value.trim();
    const servico = document.getElementById('servico')?.value.trim();

    if (!nome || !whatsapp || !servico || !state.selectedDate || !state.selectedTime) {
      updateStatus('Selecione nome, WhatsApp, serviço, data e horário.', true);
      return;
    }

    try {
      const response = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: state.selectedDate,
          horario: state.selectedTime,
          nome,
          whatsapp,
          servico,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível confirmar o agendamento.');
      }

      updateStatus(`Agendamento confirmado para ${formatDisplayDate(state.selectedDate)} às ${state.selectedTime}.`, false);
      form.reset();
      state.selectedDate = '';
      state.selectedTime = '';
      renderCalendar();
      loadAvailableTimes();
    } catch (error) {
      updateStatus(error.message, true);
    }
  });

  renderCalendar();
  loadAvailableTimes();
}

function initLegacyBooking() {
  const dateSelect = document.getElementById('data');
  const timeSelect = document.getElementById('hora');
  const form = document.getElementById('agenda-form');

  if (!dateSelect || !timeSelect || !form) return;

  const populateDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateSelect.innerHTML = '';

    for (let i = 0; i < 30; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() === 0) continue;

      const option = document.createElement('option');
      option.value = formatIsoDate(date);
      option.textContent = formatDisplayDate(option.value);
      dateSelect.appendChild(option);
    }
  };

  const loadTimesForDate = async () => {
    const selectedDate = dateSelect.value;
    if (!selectedDate) return;

    timeSelect.innerHTML = '<option value="">Carregando...</option>';

    try {
      const response = await fetch(`/api/horarios?data=${selectedDate}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao carregar horários');

      const options = payload.horarios || [];
      timeSelect.innerHTML = '<option value="">Selecione o horário</option>';

      options.forEach((slot) => {
        if (!slot.disponivel) return;

        const option = document.createElement('option');
        option.value = slot.horario;
        option.textContent = slot.horario;
        timeSelect.appendChild(option);
      });
    } catch (error) {
      timeSelect.innerHTML = '<option value="">Erro ao carregar</option>';
      alert(error.message);
    }
  };

  const formatIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  };

  populateDates();
  dateSelect.addEventListener('change', loadTimesForDate);
  loadTimesForDate();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = document.getElementById('nome')?.value.trim();
    const whatsapp = document.getElementById('whatsapp')?.value.trim();
    const servico = document.getElementById('servico')?.value.trim();
    const data = dateSelect.value;
    const horario = timeSelect.value;

    if (!nome || !whatsapp || !servico || !data || !horario) {
      alert('Preencha nome, WhatsApp, serviço, data e horário.');
      return;
    }

    try {
      const response = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, horario, nome, whatsapp, servico }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao agendar.');
      }

      alert(`Agendamento confirmado para ${data} às ${horario}.`);
      form.reset();
      populateDates();
      loadTimesForDate();
    } catch (error) {
      alert(error.message);
    }
  });
}

