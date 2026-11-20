export function createEnvironment() {
  let time = 0.34;
  let weatherDrift = 0;

  function update(dt) {
    time = (time + dt / 540) % 1;
    weatherDrift += dt;
  }

  function setTime(value) {
    time = ((value % 1) + 1) % 1;
  }

  function night() {
    if (time < 0.18) return 1;
    if (time < 0.27) return 1 - (time - 0.18) / 0.09;
    if (time < 0.72) return 0;
    if (time < 0.82) return (time - 0.72) / 0.1;
    return 1;
  }

  function sky() {
    const darkness = night();
    if (darkness > 0.6) return '#122b48';
    if (time > 0.68) return '#c47968';
    if (time < 0.24) return '#4b6a96';
    return '#8ec8e0';
  }

  function label() {
    if (time < 0.2) return 'Night';
    if (time < 0.3) return 'Sunrise';
    if (time < 0.65) return 'Sunny afternoon';
    if (time < 0.78) return 'Golden hour';
    return 'Night';
  }

  function clock() {
    const minutes = Math.floor(time * 24 * 60);
    const hour = Math.floor(minutes / 60) % 24;
    return `${String(hour).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  return {
    update, setTime, night, sky, label, clock,
    get time() { return time; },
    get drift() { return weatherDrift; },
    get lightsOn() { return night() > 0.35; },
  };
}
