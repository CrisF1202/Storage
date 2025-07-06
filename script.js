const backendURL = 'https://script.google.com/macros/s/AKfycby5MbzF72uJn5VGbjlUGqqQvnDgBFOPRNWqdCeY2qbbmZWZyroE5nqSBOG3laKKpycRNA/exec';

async function fetchData(sheet) {
  const res = await fetch(`${backendURL}?sheet=${sheet}`);
  return res.json();
}

async function postData(sheet, data) {
  await fetch(backendURL, {
    method: 'POST',
    body: JSON.stringify({ sheet, data }),
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateTables() {
  const storageList = await fetchData('storage');
  const recipeList = await fetchData('recipes');
  const logList = await fetchData('logs');

  let storage = {};
  storageList.forEach(row => storage[row.name] = row);

  let sBody = document.querySelector("#storage-table tbody");
  sBody.innerHTML = "";
  for (const [k, v] of Object.entries(storage)) {
    let qty = parseFloat(v.qty);
    let used = parseFloat(v.used) || 0;
    let portion = parseFloat(v.portion);
    let unit = v.unit;
    let label = v.label || unit;
    let mode = v.mode;
    let cost = parseFloat(v.cost);

    let totalBase = qty * portion;
    let left = totalBase - used;
    let labelQty = (left / portion).toFixed(2);
    let leftLabel = `${labelQty} ${label}`;

    let totalCost = mode === "bulk" ? cost * qty : cost;
    let costPerItem = totalCost / qty;

    sBody.innerHTML += `
      <tr>
        <td>${k}</td>
        <td>${qty}</td>
        <td>${label}</td>
        <td>${used.toFixed(2)} ${unit}</td>
        <td>${leftLabel}</td>
        <td>₱${totalCost.toFixed(2)}</td>
        <td>₱${costPerItem.toFixed(2)} per ${label}</td>
      </tr>`;
  }

  let rBody = document.querySelector("#recipe-table tbody");
  rBody.innerHTML = "";
  recipeList.forEach(row => {
    rBody.innerHTML += `<tr><td>${row.product}</td><td>${row.name}</td><td>${row.qty}</td><td>${row.unit}</td></tr>`;
  });

  let bSel = document.getElementById("batch-product");
  const products = [...new Set(recipeList.map(r => r.product))];
  bSel.innerHTML = products.map(r => `<option value="${r}">${r}</option>`).join("");

  let lBody = document.querySelector("#batch-log tbody");
  lBody.innerHTML = logList.map(l => `<tr><td>${l.date}</td><td>${l.product}</td><td>${l.qty}</td><td>₱${parseFloat(l.cost).toFixed(2)}</td></tr>`).join("");
}

function addStorage() {
  const data = {
    name: document.getElementById("store-name").value.trim(),
    qty: document.getElementById("store-qty").value,
    cost: document.getElementById("store-cost").value,
    portion: document.getElementById("store-portion").value,
    label: document.getElementById("store-label").value,
    unit: document.getElementById("store-unit").value,
    used: 0,
    mode: document.getElementById("store-cost-mode").value
  };
  if (!data.name || !data.qty || !data.cost || !data.portion) {
    alert("Missing fields");
    return;
  }
  postData("storage", data).then(updateTables);
}

function addRecipeIngredient() {
  let div = document.createElement("div");
  div.innerHTML = `<input placeholder="Ingredient" class="rname" onblur="filterUnitOptions(this)"> 
                   <input type="number" placeholder="Qty" class="rqty"> 
                   <select class="runit">
                     <option value="g">g</option>
                     <option value="kg">kg</option>
                     <option value="ml">ml</option>
                     <option value="l">L</option>
                     <option value="piece">piece</option>
                   </select>`;
  document.getElementById("recipe-list").appendChild(div);
}

function filterUnitOptions(input) {
  // Skip compatibility filtering for now; assume user knows correct unit.
}

function saveRecipe() {
  let product = document.getElementById("recipe-name").value;
  let items = document.querySelectorAll("#recipe-list div");
  if (!product || items.length === 0) return alert("Missing recipe");

  items.forEach(i => {
    let name = i.querySelector(".rname").value;
    let qty = i.querySelector(".rqty").value;
    let unit = i.querySelector(".runit").value;
    if (name && qty) {
      postData("recipes", { product, name, qty, unit });
    }
  });
  setTimeout(updateTables, 500);
}

function produceBatch() {
  let product = document.getElementById("batch-product").value;
  let qty = parseInt(document.getElementById("batch-qty").value);
  if (!product || isNaN(qty)) return alert("Invalid input");
  const log = {
    date: new Date().toISOString().split('T')[0],
    product,
    qty,
    cost: 0 // Can't auto-compute cost yet
  };
  postData("logs", log).then(updateTables);
}

updateTables();
