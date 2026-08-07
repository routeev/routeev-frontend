// Portado desde js/api.js#cloudinaryResize. Cloudinary sirve siempre la
// imagen a resolución completa (~1000px de ancho) salvo que la URL pida una
// transformación -- un avatar de 72px o una tarjeta chica no necesitan eso.
// w_ = ancho máximo, q_auto = Cloudinary elige la calidad según el
// contenido, f_auto = WebP/AVIF si el navegador lo soporta, JPEG si no --
// todo sin volver a subir nada, la transformación es parte de la URL de
// lectura y Cloudinary genera esa variante la primera vez que se pide.
//
// No hace nada (devuelve la URL tal cual) si no es de Cloudinary: el camino
// de respaldo del showroom (fotos servidas desde nuestro propio backend,
// /api/showroom/imagen/...) ya se sirven en el tamaño que pide
// showroom_images.py y no tiene este problema.
export function cloudinaryResize(url: string | undefined, width: number): string | undefined {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
}
