// Crea elementos con textContent (nunca innerHTML): seguro con datos del usuario.
export const h = (tag, props = {}, ...kids) => {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kids.filter((k) => k != null));
  return el;
};
