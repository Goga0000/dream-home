document.addEventListener("DOMContentLoaded", () => {
  window.swiperInstance = new Swiper(".swiper", {
    loop: false,
    autoplay: false,
    slidesPerView: "auto",
    centeredSlides: true,
  });

  const MAP_ID = "sdfkj343jhsdfkhfgd";
  let map = null;
  let activeMarkerIndex = null;
  let markersCache = new Map(); // Кэш маркеров: ключ - индекс, значение - объект { marker, content }

  const createMarkerFromItem = (item, i) => {
    const lat = parseFloat(item.dataset.lat);
    const lng = parseFloat(item.dataset.lng);
    const img = item.dataset.img || "";
    const title = item.querySelector("h3")?.innerText || "Объект";

    const markerContent = document.createElement("div");
    markerContent.className = "custom-marker";
    Object.assign(markerContent.style, {
      width: "48px",
      height: "48px",
      border: "3px solid white",
      borderRadius: "50%",
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 2px 8px rgba(76,77,220,0.16)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border 0.2s",
    });

    const imgEl = document.createElement("img");
    imgEl.src = img;
    imgEl.alt = title;
    Object.assign(imgEl.style, { width: "100%", height: "100%", objectFit: "cover" });
    markerContent.appendChild(imgEl);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat, lng },
      content: markerContent,
      title,
    });

    marker.addListener("gmp-click", () => setActiveMarker(i, true));

    return { marker, content: markerContent };
  };

  const setActiveMarker = (idx = null, scrollSwiper = false) => {
    activeMarkerIndex = idx;
    markersCache.forEach(({ content }, i) => {
      content.style.border = i === idx ? "3px solid #4C4DDC" : "3px solid white";
      const item = document.querySelectorAll(".maps-item:not([hidden])")[i];
      if (item) item.classList.toggle("active-slide", i === idx);
    });
    document.querySelectorAll(".swiper-slide").forEach((slide, i) =>
      slide.classList.toggle("active-slide", i === idx)
    );
    if (scrollSwiper && window.swiperInstance?.slideTo && idx !== null) {
      window.swiperInstance.slideTo(idx);
    }
  };

  const updateMarkers = () => {
    if (!map) return;

    const items = Array.from(document.querySelectorAll(".maps-item:not([hidden])"));
    if (!items.length) {
      // Удаляем все маркеры, если нет элементов
      markersCache.forEach(({ marker }) => marker.setMap(null));
      markersCache.clear();
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    // Создаем новый кэш для обновленных маркеров
    const newMarkersCache = new Map();

    items.forEach((item, i) => {
      bounds.extend({ lat: parseFloat(item.dataset.lat), lng: parseFloat(item.dataset.lng) });

      if (markersCache.has(i)) {
        // Используем существующий маркер из кэша
        const markerObj = markersCache.get(i);
        newMarkersCache.set(i, markerObj);
        markersCache.delete(i);
      } else {
        // Создаем новый маркер
        const markerObj = createMarkerFromItem(item, i);
        newMarkersCache.set(i, markerObj);
      }
    });

    // Удаляем маркеры, которые остались в старом кэше (они не нужны)
    markersCache.forEach(({ marker }) => marker.setMap(null));

    // Обновляем кэш
    markersCache = newMarkersCache;

    // Отобразить все маркеры
    markersCache.forEach(({ marker }) => marker.setMap(map));

    // Подстраиваем карту под маркеры
    if (items.length > 1) {
      map.fitBounds(bounds, 80);
    } else {
      const lat = parseFloat(items[0].dataset.lat);
      const lng = parseFloat(items[0].dataset.lng);
      map.setCenter({ lat, lng });
      map.setZoom(13);
    }

    setActiveMarker(null);
  };

  const animateBarGraph = () => {
    const priceElements = document.querySelectorAll("[data-price]");
    if (!priceElements.length) return;

    const prices = Array.from(priceElements)
      .map((el) => Number(el.getAttribute("data-price").replace(/\s/g, "")))
      .filter((p) => !isNaN(p));
    if (!prices.length) return;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const NUM_BARS = 20;
    const barItems = document.querySelectorAll(".bar-item[data-bar]");
    if (!barItems.length) return;

    const interval = (maxPrice - minPrice) / NUM_BARS;
    const counts = new Array(NUM_BARS).fill(0);

    prices.forEach((price) => {
      let idx = Math.floor((price - minPrice) / interval);
      if (idx === NUM_BARS) idx = NUM_BARS - 1;
      counts[idx]++;
    });

    const maxCount = Math.max(...counts);

    const animateHeight = (el, to, duration = 500) => {
      el.style.transition = `height ${duration}ms ease-in-out`;
      el.style.height = `${to}%`;
    };

    barItems.forEach((bar) => {
      const idx = Number(bar.getAttribute("data-bar")) - 1;
      const height = maxCount ? (counts[idx] / maxCount) * 100 : 0;
      animateHeight(bar, height, 800);
    });
  };

  const waitForMapInit = (retries = 20) => {
    const mapEl = document.getElementById("custom-map");
    const firstItem = document.querySelector(".maps-item:not([hidden])");
    if (!mapEl || !firstItem || mapEl.offsetHeight === 0) {
      if (retries > 0) setTimeout(() => waitForMapInit(retries - 1), 300);
      return;
    }

    map = new google.maps.Map(mapEl, {
      zoom: 11,
      center: { lat: parseFloat(firstItem.dataset.lat), lng: parseFloat(firstItem.dataset.lng) },
      mapId: MAP_ID,
      disableDefaultUI: true,
    });
    map.addListener("click", () => setActiveMarker(null));

    updateMarkers();
    animateBarGraph();
  };

  window.initMap = () => waitForMapInit();

  window.swiperInstance.on("slideChange", () => {
    setActiveMarker(window.swiperInstance.activeIndex, false);
  });

  const rerender = () => {
    if (map) updateMarkers();
    if (window.swiperInstance) window.swiperInstance.update();
    setActiveMarker(null);
  };

  document.addEventListener("fs-cmsfilter-update", rerender);
  document.getElementById("btts-load")?.addEventListener("click", () => setTimeout(rerender, 400));
  document.querySelector('[fs-list-element="clear"]')?.addEventListener("click", () => setTimeout(rerender, 400));
  document.addEventListener("click", (e) => {
    if (e.target.closest('[fs-list-element="tag-remove"]')) setTimeout(rerender, 400);
  });

  const input = document.getElementById("search-filter");
  if (input) {
    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTimeout(rerender, 100), 200);
    });
  }
});
