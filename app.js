const SUPABASE_URL = "https://bjoxewglffzjdpuayiff.supabase.co";
const SUPABASE_KEY = "sb_publishable_8qRvMeEpTjBzPsCDGFYqcg_E9hhIqjB";

let currentTable = "Halalfood";
let currentView = "map";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const map = L.map("map").setView(
  [50.1109, 8.6821],
  9
);

L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap-Mitwirkende"
  }
).addTo(map);

/* Allgemeine Elemente */

const searchInput =
  document.getElementById("search");

const searchSuggestions =
  document.getElementById("search-suggestions");

const menuEntries =
  document.querySelectorAll(".menu-entry");

const pageTitle =
  document.getElementById("page-title");

const pageSubtitle =
  document.getElementById("page-subtitle");

/* Kartenansicht */

const mapLayout =
  document.getElementById("map-layout");

const restaurantList =
  document.getElementById("restaurant-list");

const statusBox =
  document.getElementById("status");

const resultCount =
  document.getElementById("result-count");

const resultsTitle =
  document.getElementById("results-title");

const mapInfoCard =
  document.getElementById("map-info-card");

/* Fleischmarkenansicht */

const brandsLayout =
  document.getElementById("brands-layout");

const brandList =
  document.getElementById("brand-list");

const brandStatus =
  document.getElementById("brand-status");

const brandResultCount =
  document.getElementById("brand-result-count");

/* Daten */

let entries = [];

let markerLayer =
  L.layerGroup().addTo(map);

/* Hilfsfunktionen */

function clean(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createAddress(item) {
  const street = clean(item.adresse);

  const cityLine = [
    clean(item.postleitzahl),
    clean(item.stadt)
  ]
    .filter(Boolean)
    .join(" ");

  return [
    street,
    cityLine
  ]
    .filter(Boolean)
    .join(", ");
}

function hasCoordinates(item) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

function isYes(value) {
  const normalized = clean(value).toLowerCase();

  return [
    "ja",
    "true",
    "1",
    "yes"
  ].includes(normalized);
}

function safeExternalUrl(value) {
  const url = clean(value);

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `https://${url}`;
}

/* Öffnungszeiten */

function formatOpeningHours(value) {
  const text = clean(value);

  const emptyValues = [
    "",
    "null",
    "undefined",
    "-",
    "keine angabe",
    "nicht bekannt"
  ];

  if (emptyValues.includes(text.toLowerCase())) {
    return "";
  }

  const days = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag"
  ];

  let normalized = text
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim();

  days.forEach((day) => {
    normalized = normalized.replace(
      new RegExp(`\\s*${day}\\s*`, "gi"),
      `|${day}#`
    );
  });

  const rows = normalized
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex =
        part.indexOf("#");

      if (separatorIndex === -1) {
        return "";
      }

      const day = part
        .slice(0, separatorIndex)
        .trim();

      const hours = part
        .slice(separatorIndex + 1)
        .trim();

      if (!day || !hours) {
        return "";
      }

      const formattedHours =
        escapeHtml(hours)
          .replace(/\s*;\s*/g, "<br>")
          .replace(/\s*\/\s*/g, "<br>")
          .replace(
            /\s*,\s*(?=\d{1,2}:\d{2})/g,
            "<br>"
          );

      return `
        <div class="opening-row">
          <strong>${escapeHtml(day)}</strong>
          <span>${formattedHours}</span>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <details class="opening-details">
      <summary>
        🕒 Öffnungszeiten anzeigen
      </summary>

      <div class="opening-list">
        ${rows}
      </div>
    </details>
  `;
}

/* Kartenlinks */

function createMapLinks(item) {
  if (!hasCoordinates(item)) {
    return "";
  }

  const latitude =
    Number(item.latitude);

  const longitude =
    Number(item.longitude);

  const name =
    encodeURIComponent(
      clean(item.name || "Eintrag")
    );

  const googleMapsUrl =
    "https://www.google.com/maps/dir/" +
    `?api=1&destination=${latitude},${longitude}`;

  const appleMapsUrl =
    "https://maps.apple.com/" +
    `?daddr=${latitude},${longitude}&q=${name}`;

  return `
    <div class="map-links">
      <a
        class="map-button"
        href="${googleMapsUrl}"
        target="_blank"
        rel="noopener"
      >
        Google Maps
      </a>

      <a
        class="map-button"
        href="${appleMapsUrl}"
        target="_blank"
        rel="noopener"
      >
        Apple Karten
      </a>
    </div>
  `;
}

/* Infokarte auf der Karte */

function hideMapInfo() {
  if (!mapInfoCard) {
    return;
  }

  mapInfoCard.classList.remove("visible");
  mapInfoCard.innerHTML = "";
}

function showMapInfo(item) {
  if (!mapInfoCard) {
    return;
  }

  const address =
    createAddress(item);

  mapInfoCard.innerHTML = `
    <button
      class="map-info-close"
      type="button"
      aria-label="Infokarte schließen"
    >
      ×
    </button>

    <h3>
      ${escapeHtml(item.name || "Eintrag")}
    </h3>

    ${
      address
        ? `<p>📍 ${escapeHtml(address)}</p>`
        : ""
    }

    ${formatOpeningHours(item.oeffnungszeiten)}

    ${
      item.telefonnummer
        ? `
          <p>
            ☎️
            <a href="tel:${escapeHtml(item.telefonnummer)}">
              ${escapeHtml(item.telefonnummer)}
            </a>
          </p>
        `
        : ""
    }

    ${
      item.webseite
        ? `
          <p>
            <a
              href="${escapeHtml(safeExternalUrl(item.webseite))}"
              target="_blank"
              rel="noopener"
            >
              Webseite öffnen
            </a>
          </p>
        `
        : ""
    }

    ${
      item.hinweise
        ? `
          <div class="hinweis">
            ℹ️ ${escapeHtml(item.hinweise)}
          </div>
        `
        : ""
    }

    ${createMapLinks(item)}
  `;

  mapInfoCard.classList.add("visible");

  const closeButton =
    mapInfoCard.querySelector(".map-info-close");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        hideMapInfo();
      }
    );
  }

  mapInfoCard
    .querySelectorAll("a, summary, details")
    .forEach((element) => {
      element.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
        }
      );
    });
}

/* Restaurants und Metzgereien rendern */

function renderMapEntries(items) {
  restaurantList.innerHTML = "";
  markerLayer.clearLayers();
  hideMapInfo();

  resultCount.textContent =
    `${items.length} ${
      items.length === 1
        ? "Eintrag"
        : "Einträge"
    }`;

  if (items.length === 0) {
    restaurantList.innerHTML =
      '<div class="empty">Keine passenden Einträge gefunden.</div>';

    return;
  }

  const coordinates = [];

  items.forEach((item) => {
    const card =
      document.createElement("article");

    card.className =
      "restaurant-card";

    const address =
      createAddress(item);

    const badges = [
      item.kategorie,
      item.land_der_kueche
    ]
      .filter(Boolean)
      .map((value) => {
        return `
          <span class="badge">
            ${escapeHtml(value)}
          </span>
        `;
      })
      .join("");

    card.innerHTML = `
      <h3>
        ${escapeHtml(
          item.name ||
          "Unbenannter Eintrag"
        )}
      </h3>

      ${
        badges
          ? `<div>${badges}</div>`
          : ""
      }

      ${
        address
          ? `<p>📍 ${escapeHtml(address)}</p>`
          : ""
      }

      ${formatOpeningHours(
        item.oeffnungszeiten
      )}

      ${
        item.telefonnummer
          ? `
            <p>
              ☎️
              <a href="tel:${escapeHtml(item.telefonnummer)}">
                ${escapeHtml(item.telefonnummer)}
              </a>
            </p>
          `
          : ""
      }

      ${
        item.webseite
          ? `
            <p>
              <a
                href="${escapeHtml(safeExternalUrl(item.webseite))}"
                target="_blank"
                rel="noopener"
              >
                Webseite öffnen
              </a>
            </p>
          `
          : ""
      }

      ${
        item.hinweise
          ? `
            <p class="hinweis">
              ℹ️ ${escapeHtml(item.hinweise)}
            </p>
          `
          : ""
      }

      ${createMapLinks(item)}
    `;

    card
      .querySelectorAll("a, summary, details")
      .forEach((element) => {
        element.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();
          }
        );
      });

    restaurantList.appendChild(card);

    if (!hasCoordinates(item)) {
      return;
    }

    const latitude =
      Number(item.latitude);

    const longitude =
      Number(item.longitude);

    const marker =
      L.marker([
        latitude,
        longitude
      ]).addTo(markerLayer);

    coordinates.push([
      latitude,
      longitude
    ]);

    marker.on("click", () => {
      showMapInfo(item);
    });

    card.addEventListener(
      "click",
      () => {
        map.setView(
          [latitude, longitude],
          16
        );

        showMapInfo(item);
      }
    );
  });

  if (coordinates.length === 1) {
    map.setView(
      coordinates[0],
      14
    );
  } else if (coordinates.length > 1) {
    map.fitBounds(
      coordinates,
      {
        padding: [35, 35]
      }
    );
  }
}

/* Fleischmarken rendern */

function createBrandImage(item) {
  const imageUrl =
    safeExternalUrl(item.bild);

  if (imageUrl) {
    return `
      <div class="brand-image-wrapper">
        <img
          class="brand-image"
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(item.name || "Fleischmarke")}"
          loading="lazy"
          onerror="this.parentElement.innerHTML='<div class=&quot;brand-image-placeholder&quot;>🥩</div>'"
        >
      </div>
    `;
  }

  return `
    <div class="brand-image-wrapper">
      <div class="brand-image-placeholder">
        🥩
      </div>
    </div>
  `;
}

function renderBrandEntries(items) {
  brandList.innerHTML = "";

  brandResultCount.textContent =
    `${items.length} ${
      items.length === 1
        ? "Eintrag"
        : "Einträge"
    }`;

  if (items.length === 0) {
    brandList.innerHTML =
      '<div class="empty">Keine passenden Fleischmarken gefunden.</div>';

    return;
  }

  items.forEach((item) => {
    const card =
      document.createElement("article");

    card.className =
      "brand-card";

    const website =
      safeExternalUrl(item.webseite);

    const certificate =
      safeExternalUrl(item.zertifikat_link);

    const halalLabel =
      isYes(item.halal_zertifiziert)
        ? `
          <div class="halal-verified">
            ✓ Halal zertifiziert
          </div>
        `
        : "";

    card.innerHTML = `
      ${createBrandImage(item)}

      <div class="brand-card-content">
        <h3>
          ${escapeHtml(item.name || "Unbenannte Marke")}
        </h3>

        <div class="brand-meta">
          ${
            item.kategorie
              ? `
                <span class="brand-tag">
                  ${escapeHtml(item.kategorie)}
                </span>
              `
              : ""
          }

          ${
            item.herkunft
              ? `
                <span class="brand-tag">
                  ${escapeHtml(item.herkunft)}
                </span>
              `
              : ""
          }
        </div>

        ${halalLabel}

        ${
          item.zertifizierungsstelle
            ? `
              <p>
                <strong>Zertifizierungsstelle:</strong><br>
                ${escapeHtml(item.zertifizierungsstelle)}
              </p>
            `
            : ""
        }

        ${
          item.hinweise
            ? `
              <p class="hinweis">
                ℹ️ ${escapeHtml(item.hinweise)}
              </p>
            `
            : ""
        }

        ${
          website || certificate
            ? `
              <div class="brand-actions">
                ${
                  website
                    ? `
                      <a
                        class="brand-link"
                        href="${escapeHtml(website)}"
                        target="_blank"
                        rel="noopener"
                      >
                        Herstellerseite
                      </a>
                    `
                    : ""
                }

                ${
                  certificate
                    ? `
                      <a
                        class="brand-link secondary"
                        href="${escapeHtml(certificate)}"
                        target="_blank"
                        rel="noopener"
                      >
                        Zertifikat
                      </a>
                    `
                    : ""
                }
              </div>
            `
            : ""
        }
      </div>
    `;

    brandList.appendChild(card);
  });
}

/* Ansicht wechseln */

function showMapView() {
  mapLayout.hidden = false;
  brandsLayout.hidden = true;

  setTimeout(() => {
    map.invalidateSize();
  }, 50);
}

function showBrandsView() {
  mapLayout.hidden = true;
  brandsLayout.hidden = false;

  hideMapInfo();
  markerLayer.clearLayers();
}

/* Daten laden */

async function loadEntries() {
  entries = [];

  searchInput.value = "";
  searchSuggestions.innerHTML = "";
  searchSuggestions.style.display = "none";

  if (currentView === "brands") {
    showBrandsView();

    brandList.innerHTML = "";
    brandResultCount.textContent = "0 Einträge";

    brandStatus.style.display = "block";
    brandStatus.textContent =
      "Daten werden geladen …";
  } else {
    showMapView();

    restaurantList.innerHTML = "";
    markerLayer.clearLayers();
    hideMapInfo();

    resultCount.textContent = "0 Einträge";

    statusBox.style.display = "block";
    statusBox.textContent =
      "Daten werden geladen …";
  }

  const { data, error } =
    await client
      .from(currentTable)
      .select("*")
      .order(
        "name",
        {
          ascending: true
        }
      );

  if (error) {
    console.error(error);

    const errorHtml = `
      Die Daten konnten nicht geladen werden.
      <br>
      <small>
        ${escapeHtml(error.message)}
      </small>
    `;

    if (currentView === "brands") {
      brandStatus.innerHTML = errorHtml;
    } else {
      statusBox.innerHTML = errorHtml;
    }

    return;
  }

  entries = data || [];

  if (currentView === "brands") {
    brandStatus.style.display = "none";
    renderBrandEntries(entries);
  } else {
    statusBox.style.display = "none";
    renderMapEntries(entries);
  }
}

/* Suche */

function renderFilteredEntries(items) {
  if (currentView === "brands") {
    renderBrandEntries(items);
  } else {
    renderMapEntries(items);
  }
}

searchInput.addEventListener(
  "input",
  () => {
    const query =
      searchInput.value
        .toLowerCase()
        .trim();

    searchSuggestions.innerHTML = "";

    if (!query) {
      searchSuggestions.style.display =
        "none";

      renderFilteredEntries(entries);

      return;
    }

    const filtered =
      entries.filter((item) => {
        return String(
          item.name || ""
        )
          .toLowerCase()
          .includes(query);
      });

    if (filtered.length === 0) {
      searchSuggestions.innerHTML =
        '<div class="suggestion-empty">Kein Eintrag gefunden</div>';

      searchSuggestions.style.display =
        "block";

      renderFilteredEntries([]);

      return;
    }

    filtered.forEach((item) => {
      const suggestion =
        document.createElement("div");

      suggestion.className =
        "search-suggestion";

      suggestion.textContent =
        item.name ||
        "Unbenannter Eintrag";

      suggestion.addEventListener(
        "click",
        () => {
          searchInput.value =
            item.name || "";

          searchSuggestions.style.display =
            "none";

          renderFilteredEntries([item]);

          if (
            currentView === "map" &&
            hasCoordinates(item)
          ) {
            const latitude =
              Number(item.latitude);

            const longitude =
              Number(item.longitude);

            map.setView(
              [latitude, longitude],
              16
            );

            showMapInfo(item);
          }
        }
      );

      searchSuggestions.appendChild(
        suggestion
      );
    });

    searchSuggestions.style.display =
      "block";
  }
);

document.addEventListener(
  "click",
  (event) => {
    if (
      !searchInput.contains(event.target) &&
      !searchSuggestions.contains(event.target)
    ) {
      searchSuggestions.style.display =
        "none";
    }
  }
);

/* Menüpunkte */

menuEntries.forEach((entry) => {
  entry.addEventListener(
    "click",
    () => {
      currentTable =
        entry.dataset.table;

      currentView =
        entry.dataset.view || "map";

      menuEntries.forEach(
        (button) => {
          button.classList.remove(
            "active"
          );
        }
      );

      entry.classList.add(
        "active"
      );

      pageTitle.textContent =
        entry.dataset.title;

      pageSubtitle.textContent =
        entry.dataset.subtitle;

      if (
        currentView === "map" &&
        resultsTitle
      ) {
        resultsTitle.textContent =
          entry.dataset.resultsTitle;
      }

      loadEntries();
    }
  );
});

/* Start */

loadEntries();
