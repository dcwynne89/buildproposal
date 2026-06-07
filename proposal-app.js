/* ============================================================
   proposal-app.js — Consumer site logic for BuildProposal
   Manages form state, live preview, and PDF download
   ============================================================ */

// ── State ─────────────────────────────────────────────────────
let scopeSections = [{ title: '', description: '', deliverables: '' }];
let milestones = [{ phase: '', duration: '', date: '' }];
let lineItems = [{ description: '', quantity: 1, rate: 0 }];
let accentColor = '#8b5cf6';
let isGenerating = false;

// ── DOM refs ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Set default dates
  const today = new Date();
  const in30  = new Date(today); in30.setDate(today.getDate() + 30);
  $("proposalDate").value = today.toISOString().split("T")[0];
  $("validUntil").value   = in30.toISOString().split("T")[0];

  renderScopeSections();
  renderMilestones();
  renderLineItems();
  bindEvents();
  updatePreview();
});

function bindEvents() {
  // Color picker
  $("accentColor").addEventListener("input", (e) => {
    accentColor = e.target.value;
    $("accentColorHex").value = e.target.value;
    updatePreview();
  });
  $("accentColorHex").addEventListener("input", (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      accentColor = e.target.value;
      $("accentColor").value = e.target.value;
      updatePreview();
    }
  });

  // Add scope section
  $("btnAddScope").addEventListener("click", () => {
    scopeSections.push({ title: '', description: '', deliverables: '' });
    renderScopeSections();
    updatePreview();
  });

  // Add milestone
  $("btnAddMilestone").addEventListener("click", () => {
    milestones.push({ phase: '', duration: '', date: '' });
    renderMilestones();
    updatePreview();
  });

  // Add line item
  $("btnAddItem").addEventListener("click", () => {
    lineItems.push({ description: '', quantity: 1, rate: 0 });
    renderLineItems();
    updateTotals();
    updatePreview();
  });

  // Download
  $("btnDownload").addEventListener("click", downloadProposal);

  // Listen to all form inputs for live preview
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", () => { updateTotals(); updatePreview(); });
  });

  // Toast close
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("toast")) e.target.classList.remove("show");
  });
}

// ── Scope Sections ────────────────────────────────────────────
function renderScopeSections() {
  const container = $("scopeSections");
  container.innerHTML = "";

  scopeSections.forEach((section, i) => {
    const div = document.createElement("div");
    div.className = "dynamic-section";
    div.innerHTML = `
      <button type="button" class="btn-remove-section" data-idx="${i}" title="Remove Section">✕</button>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Section Title</label>
        <input type="text" placeholder="e.g. Discovery & Research" value="${escHtml(section.title)}" data-idx="${i}" data-field="title" class="scope-input">
      </div>
      <div class="form-group" style="margin-bottom:0.75rem;">
        <label>Description</label>
        <textarea rows="3" placeholder="Describe the work involved in this phase..." data-idx="${i}" data-field="description" class="scope-input">${escHtml(section.description)}</textarea>
      </div>
      <div class="form-group">
        <label>Deliverables (one per line)</label>
        <textarea rows="2" placeholder="• Competitive analysis report&#10;• User persona documents&#10;• Sitemap wireframe" data-idx="${i}" data-field="deliverables" class="scope-input">${escHtml(section.deliverables)}</textarea>
      </div>
    `;
    container.appendChild(div);
  });

  // Bind events
  container.querySelectorAll(".scope-input").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      scopeSections[idx][field] = e.target.value;
      updatePreview();
    });
  });

  container.querySelectorAll(".btn-remove-section").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = +e.target.dataset.idx;
      if (scopeSections.length > 1) {
        scopeSections.splice(idx, 1);
        renderScopeSections();
        updatePreview();
      }
    });
  });
}

// ── Milestones ────────────────────────────────────────────────
function renderMilestones() {
  const container = $("milestones");
  container.innerHTML = "";

  milestones.forEach((ms, i) => {
    const row = document.createElement("div");
    row.className = "milestone-row";
    row.innerHTML = `
      <input type="text" placeholder="e.g. Phase 1: Discovery" value="${escHtml(ms.phase)}" data-idx="${i}" data-field="phase" class="ms-input">
      <input type="text" placeholder="2 weeks" value="${escHtml(ms.duration)}" data-idx="${i}" data-field="duration" class="ms-input">
      <input type="date" value="${ms.date}" data-idx="${i}" data-field="date" class="ms-input">
      <button class="btn-remove-item" data-idx="${i}" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });

  // Bind events
  container.querySelectorAll(".ms-input").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      milestones[idx][field] = e.target.value;
      updatePreview();
    });
  });

  container.querySelectorAll(".btn-remove-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = +e.target.dataset.idx;
      if (milestones.length > 1) {
        milestones.splice(idx, 1);
        renderMilestones();
        updatePreview();
      }
    });
  });
}

// ── Line Items ────────────────────────────────────────────────
function renderLineItems() {
  const container = $("lineItems");
  container.innerHTML = "";

  lineItems.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = `
      <input type="text"   class="li-desc"  placeholder="Description"  value="${escHtml(item.description)}" data-idx="${i}" data-field="description">
      <input type="number" class="li-qty"   placeholder="Qty"  value="${item.quantity}"  min="0" step="1"    data-idx="${i}" data-field="quantity">
      <input type="number" class="li-rate"  placeholder="Rate" value="${item.rate}"      min="0" step="0.01" data-idx="${i}" data-field="rate">
      <span class="li-amount">${fmtCurrency((item.quantity || 1) * (item.rate || 0))}</span>
      <button class="btn-remove-item" data-idx="${i}" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });

  // Bind row events
  container.querySelectorAll("input").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx   = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      lineItems[idx][field] = field === "description" ? e.target.value : parseFloat(e.target.value) || 0;
      const row    = e.target.closest(".line-item-row");
      const amount = (lineItems[idx].quantity || 1) * (lineItems[idx].rate || 0);
      row.querySelector(".li-amount").textContent = fmtCurrency(amount);
      updateTotals();
      updatePreview();
    });
  });

  container.querySelectorAll(".btn-remove-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = +e.target.dataset.idx;
      if (lineItems.length > 1) {
        lineItems.splice(idx, 1);
        renderLineItems();
        updateTotals();
        updatePreview();
      }
    });
  });
}

// ── Totals ────────────────────────────────────────────────────
function calcTotals() {
  const subtotal = lineItems.reduce((s, i) => s + (i.quantity || 1) * (i.rate || 0), 0);
  const taxRate  = parseFloat($("taxRate").value)  || 0;
  const discount = parseFloat($("discount").value) || 0;
  const tax      = subtotal * (taxRate / 100);
  const total    = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total, taxRate };
}

function updateTotals() {
  const { subtotal, tax, discount, total } = calcTotals();
  $("dispSubtotal").textContent = fmtCurrency(subtotal);
  $("dispTax").textContent      = fmtCurrency(tax);
  $("dispDiscount").textContent = `-${fmtCurrency(discount)}`;
  $("dispTotal").textContent    = fmtCurrency(total);
}

// ── Live Preview ──────────────────────────────────────────────
function updatePreview() {
  const data = collectFormData();
  $("previewBody").innerHTML = renderPreviewHTML(data);
}

function collectFormData() {
  const currency = $("currency").value || "$";
  return {
    from: {
      name:    $("fromName").value,
      email:   $("fromEmail").value,
      address: [$("fromStreet").value, $("fromCity").value, $("fromState").value].filter(Boolean).join(", "),
      phone:   $("fromPhone").value,
    },
    to: {
      name:    $("toName").value,
      email:   $("toEmail").value,
      address: [$("toStreet").value, $("toCity").value, $("toState").value].filter(Boolean).join(", "),
    },
    proposal: {
      number:  $("proposalNumber").value || "PRP-001",
      date:    $("proposalDate").value,
      project: $("projectName").value,
    },
    valid_until:      $("validUntil").value,
    executiveSummary: $("executiveSummary").value,
    scopeSections:    scopeSections,
    milestones:       milestones,
    items:            lineItems,
    ...calcTotals(),
    terms:            $("terms").value,
    acceptanceClause: $("acceptanceClause").value,
    currency,
    color:            accentColor,
  };
}

function renderPreviewHTML(d) {
  const col  = d.color || "#8b5cf6";
  const cur  = d.currency || "$";
  const fmt  = (n) => `${cur}${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const esc  = escHtml;

  // Scope sections HTML
  const scopeHTML = d.scopeSections.map((s, i) => {
    if (!s.title && !s.description && !s.deliverables) return '';
    const deliverables = s.deliverables ? s.deliverables.split('\n').filter(Boolean).map(line => {
      const clean = line.replace(/^[\s•\-\*]+/, '').trim();
      return clean ? `<li style="font-size:10px;color:#4a5568;margin-bottom:2px;">${esc(clean)}</li>` : '';
    }).join('') : '';
    return `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;color:#1a202c;margin-bottom:3px;">${i + 1}. ${esc(s.title) || '<em style="color:#aaa">Untitled Section</em>'}</div>
        ${s.description ? `<div style="font-size:10px;color:#4a5568;margin-bottom:4px;line-height:1.5;">${esc(s.description)}</div>` : ''}
        ${deliverables ? `<ul style="margin:0 0 0 16px;padding:0;">${deliverables}</ul>` : ''}
      </div>
    `;
  }).join('');

  // Milestones HTML
  const hasMs = d.milestones.some(m => m.phase || m.duration || m.date);
  const milestonesHTML = hasMs ? `
    <div style="margin-bottom:12px;">
      <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:6px;">TIMELINE / MILESTONES</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:${col}15;">
            <th style="padding:4px 8px;text-align:left;font-size:9px;font-weight:700;color:${col};">PHASE</th>
            <th style="padding:4px 8px;text-align:center;font-size:9px;font-weight:700;color:${col};width:80px;">DURATION</th>
            <th style="padding:4px 8px;text-align:right;font-size:9px;font-weight:700;color:${col};width:100px;">TARGET DATE</th>
          </tr>
        </thead>
        <tbody>
          ${d.milestones.filter(m => m.phase || m.duration || m.date).map((m, i) => `
            <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'};">
              <td style="padding:4px 8px;font-size:10px;">${esc(m.phase) || '—'}</td>
              <td style="padding:4px 8px;text-align:center;font-size:10px;">${esc(m.duration) || '—'}</td>
              <td style="padding:4px 8px;text-align:right;font-size:10px;">${m.date || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  return `
    <div style="font-family:Inter,sans-serif;font-size:12px;color:#1a202c;padding:24px;background:#fff;min-height:500px;">
      <!-- Cover Section -->
      <div style="height:6px;background:${col};border-radius:3px;margin-bottom:16px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:4px;">PROJECT PROPOSAL</div>
          <div style="font-size:16px;font-weight:800;color:#1a202c;margin-bottom:2px;">${esc(d.proposal.project) || '<span style="color:#aaa">Project Name</span>'}</div>
          <div style="font-size:20px;font-weight:800;color:${col};">#${esc(d.proposal.number)}</div>
        </div>
        <div style="text-align:right;">
          ${d.proposal.date   ? `<div style="font-size:10px;color:#4a5568;">Date: ${d.proposal.date}</div>` : ''}
          ${d.valid_until     ? `<div style="font-size:10px;color:#e53e3e;font-weight:600;">Valid Until: ${d.valid_until}</div>` : ''}
        </div>
      </div>

      <!-- From / To -->
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:4px;">PREPARED BY</div>
          <div style="font-weight:700;font-size:13px;">${esc(d.from.name) || '<span style="color:#aaa">Your Company</span>'}</div>
          ${d.from.address ? `<div style="color:#718096;font-size:10px;">${esc(d.from.address)}</div>` : ''}
          ${d.from.email   ? `<div style="color:#718096;font-size:10px;">${esc(d.from.email)}</div>` : ''}
          ${d.from.phone   ? `<div style="color:#718096;font-size:10px;">${esc(d.from.phone)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:4px;">PREPARED FOR</div>
          <div style="font-weight:700;font-size:13px;">${esc(d.to.name) || '<span style="color:#aaa">Client Name</span>'}</div>
          ${d.to.address ? `<div style="color:#718096;font-size:10px;">${esc(d.to.address)}</div>` : ''}
          ${d.to.email   ? `<div style="color:#718096;font-size:10px;">${esc(d.to.email)}</div>` : ''}
        </div>
      </div>

      <!-- Divider -->
      <div style="height:2px;background:${col};border-radius:1px;margin-bottom:14px;"></div>

      <!-- Executive Summary -->
      ${d.executiveSummary ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:4px;">EXECUTIVE SUMMARY</div>
          <div style="font-size:10px;color:#4a5568;line-height:1.6;">${esc(d.executiveSummary)}</div>
        </div>
      ` : ''}

      <!-- Scope of Work -->
      ${scopeHTML ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:6px;">SCOPE OF WORK</div>
          ${scopeHTML}
        </div>
      ` : ''}

      <!-- Timeline -->
      ${milestonesHTML}

      <!-- Pricing Table -->
      <div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:6px;">INVESTMENT</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="background:${col};color:#fff;">
            <th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:700;">DESCRIPTION</th>
            <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;width:50px;">QTY</th>
            <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;width:80px;">UNIT PRICE</th>
            <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;width:80px;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${d.items.map((item, i) => `
            <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'};">
              <td style="padding:5px 8px;font-size:10px;">${esc(item.description) || '<em style="color:#aaa">Description</em>'}</td>
              <td style="padding:5px 8px;text-align:center;font-size:10px;">${item.quantity || 1}</td>
              <td style="padding:5px 8px;text-align:right;font-size:10px;">${fmt(item.rate)}</td>
              <td style="padding:5px 8px;text-align:right;font-size:10px;">${fmt((item.quantity || 1) * (item.rate || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <div style="width:220px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;"><span>Subtotal</span><span>${fmt(d.subtotal)}</span></div>
          ${d.taxRate > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;"><span>Tax (${d.taxRate}%)</span><span>${fmt(d.tax)}</span></div>` : ''}
          ${d.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;"><span>Discount</span><span>-${fmt(d.discount)}</span></div>` : ''}
          <div style="border-top:2px solid ${col};margin:6px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px;color:${col};"><span>TOTAL</span><span>${fmt(d.total)}</span></div>
        </div>
      </div>

      ${d.valid_until ? `<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:4px;padding:8px;font-size:9px;color:#5b21b6;margin-bottom:12px;">⏱ This proposal is valid until ${d.valid_until}. Pricing is subject to change after this date.</div>` : ''}
      ${d.terms ? `<div style="margin-bottom:8px;"><div style="font-size:8px;font-weight:700;color:${col};letter-spacing:1px;margin-bottom:3px;">TERMS & CONDITIONS</div><div style="font-size:10px;color:#4a5568;line-height:1.5;">${esc(d.terms)}</div></div>` : ''}

      <!-- Acceptance & Signature -->
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">
        ${d.acceptanceClause ? `<div style="font-size:9px;color:#4a5568;margin-bottom:14px;">${esc(d.acceptanceClause)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:20px;">
          <div style="width:180px;"><div style="border-top:1px solid #ccc;padding-top:4px;font-size:9px;color:#999;">Accepted by (Client)</div></div>
          <div style="width:100px;"><div style="border-top:1px solid #ccc;padding-top:4px;font-size:9px;color:#999;">Date</div></div>
          <div style="width:180px;"><div style="border-top:1px solid #ccc;padding-top:4px;font-size:9px;color:#999;">Authorized by (Issuer)</div></div>
        </div>
      </div>
    </div>
  `;
}

// ── Download ──────────────────────────────────────────────────
function downloadProposal() {
  if (isGenerating) return;

  const data = collectFormData();
  if (!data.from.name)     { showToast("Enter your company name to generate a proposal.", "error"); return; }
  if (!data.to.name)       { showToast("Enter a client name to generate a proposal.", "error"); return; }
  if (!data.proposal.project) { showToast("Enter a project name to generate a proposal.", "error"); return; }

  showToast("📄 PDF generation coming soon — preview your proposal above!", "success");
}

// ── Helpers ───────────────────────────────────────────────────
function fmtCurrency(n) {
  const cur = $("currency")?.value || "$";
  return `${cur}${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "success") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className   = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove("show"), 4000);
}
