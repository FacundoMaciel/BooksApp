import '@testing-library/jest-dom/vitest';

// jsdom no implementa el scroll.
window.scrollTo = () => {};
Element.prototype.scrollBy = () => {};
Element.prototype.scrollTo = () => {};
URL.createObjectURL = () => "blob:preview";
URL.revokeObjectURL = () => {};
