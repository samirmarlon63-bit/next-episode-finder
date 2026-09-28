# Anime Orbit

Crea una aplicación móvil premium para descubrir, organizar y guardar próximos estrenos de anime.

La aplicación debe sentirse como una aplicación nativa de iPhone moderna, inspirada visualmente en iOS 26. La prioridad es que sea elegante, rápida, limpia y fácil de utilizar.

NO quiero una aplicación con datos de ejemplo estáticos. Quiero que la información de los animes se obtenga y actualice automáticamente mediante un backend real.

NAVEGACIÓN

Utiliza una barra de navegación inferior estilo iOS 26.

Debe tener únicamente 3 secciones:

1. Nuevos
2. Guardados
3. Configuración

La barra inferior debe ser translúcida, con efecto de vidrio, desenfoque, profundidad y animaciones suaves.

No utilizar emojis en ninguna parte de la aplicación.

Utilizar únicamente iconos profesionales y minimalistas.

⸻

1. NUEVOS

Esta será la pantalla principal.

Aquí deben aparecer automáticamente todos los animes próximos a estrenarse que el sistema haya encontrado y verificado.

Organiza los animes cronológicamente, mostrando primero los próximos estrenos.

Cada anime debe aparecer en un diseño compacto, elegante y perfectamente organizado.

Cada elemento debe incluir:

* Portada del anime
* Nombre
* Título original si existe
* Fecha exacta de estreno
* Hora de estreno
* Zona horaria
* Día de la semana
* Mes y año
* Temporada
* Episodio, cuando esté disponible
* Estado
* Géneros
* Estudio
* Plataforma/servicio donde se emitirá, si está disponible
* Sinopsis breve
* Estado de la fecha: Confirmada / Por confirmar
* Fuente de información
* Fecha de última actualización

No mostrar información inventada.

Si un dato no existe, mostrar “Por confirmar”.

SISTEMA DE GUARDADO

Cada anime debe tener un botón para guardarlo.

Al guardarlo, debe aparecer inmediatamente en la sección “Guardados”.

Si ya está guardado, mostrar claramente que está guardado.

También debe ser posible eliminarlo de Guardados desde la misma pantalla.

⸻

2. GUARDADOS

Esta sección contiene exclusivamente los animes que el usuario haya guardado.

Mostrar:

* Portada
* Nombre
* Próximo episodio
* Fecha
* Hora
* Estado

Ordenar automáticamente por el próximo estreno.

Cuando cambie la fecha o el horario de un anime guardado, actualizar automáticamente la información.

Permitir eliminar animes guardados fácilmente.

⸻

3. CONFIGURACIÓN

Crear una pantalla de configuración sencilla y elegante.

Incluir:

* Zona horaria
* Notificaciones
* Apariencia
* Frecuencia de sincronización
* Fuentes utilizadas
* Última sincronización
* Estado del sistema
* Información de la aplicación

La zona horaria debe detectarse automáticamente, pero permitir cambiarla manualmente.

⸻

SISTEMA AUTOMÁTICO DE DETECCIÓN DE ANIMES

Esta es la característica MÁS IMPORTANTE de la aplicación.

No quiero tener que introducir manualmente los animes.

Crea un backend encargado de recopilar información automáticamente.

El sistema debe utilizar dos tipos de fuentes:

APIs estructuradas

Utiliza APIs reales de anime para obtener información estructurada y verificar datos.

Utiliza fuentes como AniList y Jikan/MyAnimeList cuando sea apropiado.

Fuentes de noticias

Crea un sistema de fuentes donde se puedan registrar URLs de páginas especializadas en anime, noticias, anuncios y próximos estrenos.

El backend debe poder consultar periódicamente esas fuentes.

Cuando encuentre una publicación nueva, debe analizarla y determinar si contiene información sobre:

* Nuevo anime
* Nueva temporada
* Fecha de estreno
* Cambio de fecha
* Nuevo episodio
* Retraso
* Adelanto
* Cambio de horario
* Plataforma de emisión

Cuando detecte información relevante, debe intentar relacionarla con el anime correspondiente.

⸻

PROCESAMIENTO DE LAS FUENTES

No copies simplemente toda la página.

Extrae únicamente la información necesaria para actualizar la aplicación.

Por cada descubrimiento, guardar:

* Anime identificado
* Información encontrada
* URL original
* Fuente
* Fecha de publicación, si existe
* Fecha en que fue detectado
* Fecha de última comprobación

Si una fuente proporciona información contradictoria con otra fuente, no sobrescribir automáticamente datos importantes sin verificar.

Priorizar fuentes confiables y datos estructurados.

Si no se puede confirmar una información, marcarla como “Por confirmar”.

⸻

PREVENCIÓN DE DUPLICADOS

Este sistema debe ser inteligente para evitar duplicados.

Por ejemplo, si tres páginas diferentes publican información sobre el mismo anime:

NO crear tres registros.

Crear solamente un anime y asociar las diferentes fuentes a ese registro.

También reconocer diferentes nombres del mismo anime, incluyendo:

* Nombre japonés
* Nombre internacional
* Nombre alternativo
* Romanización

⸻

SINCRONIZACIÓN AUTOMÁTICA

Configura una tarea automática en el backend.

La frecuencia predeterminada será:

Cada 2 horas.

Cada ciclo debe:

1. Consultar las APIs.
2. Revisar las fuentes configuradas.
3. Detectar publicaciones nuevas.
4. Analizar la información.
5. Identificar animes.
6. Comparar con la base de datos.
7. Crear nuevos registros cuando corresponda.
8. Actualizar información existente.
9. Detectar cambios de fechas.
10. Detectar nuevos episodios.
11. Evitar duplicados.
12. Guardar las fuentes originales.
13. Registrar la fecha de sincronización.

La sincronización debe ejecutarse en el servidor.

NO depender de que la aplicación esté abierta.

El usuario debe poder cerrar completamente la aplicación y el backend debe continuar realizando las sincronizaciones.

⸻

CAMBIOS DE FECHA

Si un anime tenía:

15 de octubre de 2026

y una fuente confiable posteriormente anuncia:

22 de octubre de 2026

el sistema debe detectar el cambio y actualizar automáticamente el anime.

Registrar la fecha anterior y la nueva fecha.

Si el anime está guardado por el usuario, actualizar también su información.

⸻

HORARIOS

Los horarios deben almacenarse correctamente con su zona horaria.

Convertir automáticamente la hora al horario local del usuario.

Por ejemplo, si una emisión ocurre a una determinada hora en Japón, mostrar automáticamente la hora correspondiente en Honduras, España, México, etc.

No realizar conversiones incorrectas por diferencias de horario de verano.

⸻

NOTIFICACIONES

Preparar el sistema para enviar notificaciones cuando:

* Aparezca un anime nuevo.
* Se confirme una fecha.
* Cambie una fecha.
* Se anuncie un episodio.
* Se acerque el estreno de un anime guardado.
* Se produzca un retraso.
* Se produzca un cambio importante.

Las notificaciones deben poder activarse o desactivarse desde Configuración.

⸻

ACTUALIZACIÓN EN TIEMPO REAL DE LA INTERFAZ

Cuando el backend detecte un nuevo anime, la aplicación debe mostrarlo automáticamente la próxima vez que consulte los datos.

No utilizar datos falsos para simular esto.

Mostrar en Configuración:

“Última sincronización”

y la fecha y hora exactas de la última actualización.

También mostrar el estado:

“Sincronización correcta”

o

“Error de sincronización”

si ocurrió algún problema.

⸻

PANEL DE ADMINISTRACIÓN

Crea una estructura preparada para un panel de administración.

Desde el panel debe ser posible:

* Agregar fuentes.
* Eliminar fuentes.
* Activar/desactivar fuentes.
* Ver última sincronización.
* Ver errores.
* Ejecutar una sincronización manual.
* Ver animes detectados recientemente.
* Revisar información pendiente de confirmar.
* Ver las fuentes asociadas a cada anime.

No mostrar este panel a usuarios normales.

⸻

DISEÑO VISUAL

El diseño debe inspirarse en iOS 26.

Quiero:

* Glassmorphism avanzado.
* Fondo oscuro elegante.
* Elementos translúcidos.
* Desenfoque realista.
* Barra inferior de vidrio.
* Animaciones suaves.
* Microinteracciones.
* Transiciones entre pantallas.
* Esquinas redondeadas.
* Espaciado amplio.
* Tipografía limpia.
* Jerarquía visual clara.
* Iconos minimalistas.
* Diseño adaptado a pantallas de iPhone.

No quiero:

* Emojis.
* Colores excesivamente brillantes.
* Botones gigantes.
* Tarjetas innecesariamente grandes.
* Bordes gruesos.
* Sombras exageradas.
* Diseño genérico de dashboard.
* Apariencia de página web.

La interfaz debe sentirse como una aplicación nativa premium.

⸻

ARQUITECTURA

Utiliza una arquitectura preparada para producción.

Separar correctamente:

Frontend
Backend
Base de datos
Sistema de sincronización
Fuentes externas
Procesamiento de información
Notificaciones

Utilizar variables de entorno para claves API.

No colocar claves secretas directamente en el frontend.

Implementar caché, manejo de errores, límites de solicitudes y prevención de solicitudes innecesarias.

La aplicación debe poder crecer posteriormente a miles de animes y usuarios sin tener que reconstruir toda la arquitectura.

⸻

IMPORTANTE

No te limites a crear el diseño visual.

Implementa la lógica funcional necesaria para que el sistema realmente pueda recopilar, procesar, verificar, almacenar y actualizar información.

No uses información ficticia para aparentar que el sistema funciona.

Si alguna fuente no permite scraping o tiene restricciones, utiliza su API, RSS/feed u otro método permitido.

Respeta las condiciones de uso de cada fuente.

La aplicación debe conservar siempre la referencia de la fuente original utilizada para obtener la información.

El objetivo final es que yo pueda abrir la aplicación y encontrar automáticamente los próximos estrenos de anime sin tener que agregarlos manualmente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://next-episode-finder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4675b86a-3f24-447f-beba-674052a8797d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
