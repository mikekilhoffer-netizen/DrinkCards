// Drink photos load through the app's dc-photo: scheme, which only serves
// image files on a local drive (see electron/main/index.js).
export const photoSrc = (path) => `dc-photo://img/?p=${encodeURIComponent(path)}`
