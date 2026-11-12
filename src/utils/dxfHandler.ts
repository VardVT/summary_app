import { jsPDF } from 'jspdf';
import { DrawnDetection, resolveEngineerFromDrawnCode } from '../components/DrawingReviewWorkspace';
import { MarkupPin } from '../components/DrawingReviewWorkspace';

export interface DxfPoint {
  x: number;
  y: number;
}

export interface DxfEntity {
  type: string;
  layer: string;
  color?: string;
  // LINE
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // CIRCLE / ARC
  x?: number;
  y?: number;
  r?: number;
  startAngle?: number;
  endAngle?: number;
  // POLYLINE
  points?: DxfPoint[];
  isClosed?: boolean;
  // TEXT / MTEXT
  text?: string;
  height?: number;
}

export interface DxfData {
  entities: DxfEntity[];
  layers: Record<string, { name: string; color?: string }>;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  texts: string[];
  rawContent: string;
  drawnResult: DrawnDetection;
}

// AutoCAD standard ACI color palette (basic mappings)
const ACI_COLORS: Record<number, string> = {
  1: '#EF4444', // Red
  2: '#EAB308', // Yellow
  3: '#22C55E', // Green
  4: '#06B6D4', // Cyan
  5: '#3B82F6', // Blue
  6: '#EC4899', // Magenta
  7: '#F8FAFC', // White / Light
  8: '#64748B', // Gray
  9: '#94A3B8', // Light Gray
};

/**
 * Parses an ASCII DXF file into structured geometry and text entities
 */
export function parseDxf(content: string): DxfData {
  const lines = content.split(/\r?\n/);
  const entities: DxfEntity[] = [];
  const layers: Record<string, { name: string; color?: string }> = {};
  const texts: string[] = [];

  let inEntitiesSection = false;
  let inTablesSection = false;
  let inLayerTable = false;
  let currentLayer: { name: string; color?: string } | null = null;
  let currentEntity: DxfEntity | null = null;
  let currentPolylinePoints: DxfPoint[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBBox = (x: number, y: number) => {
    if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };

  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i]?.trim(), 10);
    const rawVal = lines[i + 1]?.trim() ?? '';

    // Check Section Headers
    if (code === 0 && rawVal === 'SECTION') {
      const nextCode = parseInt(lines[i + 2]?.trim(), 10);
      const nextVal = lines[i + 3]?.trim();
      if (nextCode === 2) {
        if (nextVal === 'ENTITIES') inEntitiesSection = true;
        if (nextVal === 'TABLES') inTablesSection = true;
      }
    } else if (code === 0 && rawVal === 'ENDSEC') {
      inEntitiesSection = false;
      inTablesSection = false;
      inLayerTable = false;
    }

    // Parse Layers in TABLES
    if (inTablesSection) {
      if (code === 2 && rawVal === 'LAYER') {
        inLayerTable = true;
      }
      if (inLayerTable && code === 0 && rawVal === 'LAYER') {
        if (currentLayer?.name) layers[currentLayer.name] = currentLayer;
        currentLayer = { name: '' };
      }
      if (currentLayer) {
        if (code === 2) currentLayer.name = rawVal;
        if (code === 62) {
          const colorCode = Math.abs(parseInt(rawVal, 10));
          currentLayer.color = ACI_COLORS[colorCode] || '#94A3B8';
        }
      }
    }

    // Parse Entities in ENTITIES
    if (inEntitiesSection) {
      if (code === 0) {
        // Save previous entity
        if (currentEntity) {
          if (currentPolylinePoints.length > 0) {
            currentEntity.points = [...currentPolylinePoints];
          }
          entities.push(currentEntity);
        }

        currentPolylinePoints = [];
        const type = rawVal.toUpperCase();
        if (['LINE', 'LWPOLYLINE', 'POLYLINE', 'CIRCLE', 'ARC', 'TEXT', 'MTEXT', 'SOLID'].includes(type)) {
          currentEntity = {
            type,
            layer: '0',
          };
        } else {
          currentEntity = null;
        }
      } else if (currentEntity) {
        const numVal = parseFloat(rawVal);

        switch (code) {
          case 8: // Layer
            currentEntity.layer = rawVal;
            break;
          case 62: { // Color code
            const colorCode = Math.abs(parseInt(rawVal, 10));
            currentEntity.color = ACI_COLORS[colorCode];
            break;
          }
          case 10: // Start X / Center X / Vertex X
            if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
              currentPolylinePoints.push({ x: numVal, y: 0 });
            } else if (['CIRCLE', 'ARC', 'TEXT', 'MTEXT'].includes(currentEntity.type)) {
              currentEntity.x = numVal;
            } else {
              currentEntity.x1 = numVal;
            }
            updateBBox(numVal, currentEntity.y1 ?? currentEntity.y ?? 0);
            break;
          case 20: // Start Y / Center Y / Vertex Y
            if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
              if (currentPolylinePoints.length > 0) {
                currentPolylinePoints[currentPolylinePoints.length - 1].y = numVal;
                updateBBox(currentPolylinePoints[currentPolylinePoints.length - 1].x, numVal);
              }
            } else if (['CIRCLE', 'ARC', 'TEXT', 'MTEXT'].includes(currentEntity.type)) {
              currentEntity.y = numVal;
              updateBBox(currentEntity.x ?? 0, numVal);
            } else {
              currentEntity.y1 = numVal;
              updateBBox(currentEntity.x1 ?? 0, numVal);
            }
            break;
          case 11: // End X
            currentEntity.x2 = numVal;
            updateBBox(numVal, currentEntity.y2 ?? 0);
            break;
          case 21: // End Y
            currentEntity.y2 = numVal;
            updateBBox(currentEntity.x2 ?? 0, numVal);
            break;
          case 40: // Radius / Text Height
            if (currentEntity.type === 'CIRCLE' || currentEntity.type === 'ARC') {
              currentEntity.r = numVal;
            } else if (currentEntity.type === 'TEXT' || currentEntity.type === 'MTEXT') {
              currentEntity.height = numVal;
            }
            break;
          case 50: // Start Angle
            currentEntity.startAngle = (numVal * Math.PI) / 180;
            break;
          case 51: // End Angle
            currentEntity.endAngle = (numVal * Math.PI) / 180;
            break;
          case 70: // Polyline closed flag
            if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
              currentEntity.isClosed = (parseInt(rawVal, 10) & 1) === 1;
            }
            break;
          case 1: // Text content
            currentEntity.text = rawVal.replace(/\\P/g, '\n').replace(/\\A1;/g, '').trim();
            if (currentEntity.text) {
              texts.push(currentEntity.text);
            }
            break;
          case 3: // Additional MText line
            if (currentEntity.text) {
              currentEntity.text += '\n' + rawVal;
            }
            break;
        }
      }
    }
  }

  // Push final entity
  if (currentEntity) {
    if (currentPolylinePoints.length > 0) {
      currentEntity.points = [...currentPolylinePoints];
    }
    entities.push(currentEntity);
  }

  // If bounding box is empty, default
  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = 0;
    maxX = 1000;
    minY = 0;
    maxY = 700;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Extract DRAWN code from DXF text entities
  let detected: DrawnDetection = {
    code: '',
    engineer: null,
    autoDetected: false,
    status: 'unrecognized'
  };

  const allTextJoined = texts.join(' ');
  // Look for DRAWN in text entities
  for (const t of texts) {
    if (/\b(?:DRAWN|DWN|DESIGNED|PIC)\b/i.test(t)) {
      const match = t.match(/\b(?:DRAWN|DWN|DESIGNED|PIC)\s*(?:BY)?\s*[:\s\-]*\s*([A-Za-z0-9._-]+)/i);
      if (match?.[1]) {
        const res = resolveEngineerFromDrawnCode(match[1]);
        if (res.engineer) {
          detected = {
            code: res.code,
            engineer: res.engineer,
            autoDetected: true,
            status: 'detected'
          };
          break;
        }
      }
    }
  }

  // If not found in single text item, check joined text
  if (!detected.engineer) {
    const match = allTextJoined.match(/\b(?:DRAWN|DWN|DESIGNED|PIC)\s*(?:BY)?\s*[:\s\-]*\s*([A-Za-z0-9._-]+)/i);
    if (match?.[1]) {
      const res = resolveEngineerFromDrawnCode(match[1]);
      if (res.engineer) {
        detected = {
          code: res.code,
          engineer: res.engineer,
          autoDetected: true,
          status: 'detected'
        };
      }
    }
  }

  // Known code scan in DXF texts
  if (!detected.engineer) {
    for (const t of texts) {
      const res = resolveEngineerFromDrawnCode(t);
      if (res.engineer) {
        detected = {
          code: res.code,
          engineer: res.engineer,
          autoDetected: true,
          status: 'detected'
        };
        break;
      }
    }
  }

  return {
    entities,
    layers,
    bbox: { minX, minY, maxX, maxY, width, height },
    texts,
    rawContent: content,
    drawnResult: detected
  };
}

/**
 * Render parsed DXF onto an HTML5 Canvas
 */
export function renderDxfToCanvas(
  dxf: DxfData,
  canvas: HTMLCanvasElement,
  options: {
    zoom?: number;
    backgroundColor?: string;
    lineColor?: string;
  } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = options.backgroundColor || '#0B1622';
  const defaultLineColor = options.lineColor || '#E2E8F0';

  const w = canvas.width;
  const h = canvas.height;

  // Clear background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const { minX, minY, width, height } = dxf.bbox;
  if (width <= 0 || height <= 0) return;

  // Calculate uniform scale to fit drawing inside canvas with 5% margin
  const margin = Math.min(w, h) * 0.05;
  const availW = w - margin * 2;
  const availH = h - margin * 2;
  const scale = Math.min(availW / width, availH / height);

  const offsetX = margin + (availW - width * scale) / 2;
  const offsetY = margin + (availH - height * scale) / 2;

  // Helper coordinate converter (DXF has origin bottom-left; Canvas is top-left)
  const toCanvasX = (dxfX: number) => offsetX + (dxfX - minX) * scale;
  const toCanvasY = (dxfY: number) => h - (offsetY + (dxfY - minY) * scale);

  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const ent of dxf.entities) {
    const layerColor = dxf.layers[ent.layer]?.color;
    const strokeColor = ent.color || layerColor || defaultLineColor;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;

    switch (ent.type) {
      case 'LINE':
        if (ent.x1 !== undefined && ent.y1 !== undefined && ent.x2 !== undefined && ent.y2 !== undefined) {
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ent.x1), toCanvasY(ent.y1));
          ctx.lineTo(toCanvasX(ent.x2), toCanvasY(ent.y2));
          ctx.stroke();
        }
        break;

      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (ent.points && ent.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ent.points[0].x), toCanvasY(ent.points[0].y));
          for (let p = 1; p < ent.points.length; p++) {
            ctx.lineTo(toCanvasX(ent.points[p].x), toCanvasY(ent.points[p].y));
          }
          if (ent.isClosed) ctx.closePath();
          ctx.stroke();
        }
        break;

      case 'CIRCLE':
        if (ent.x !== undefined && ent.y !== undefined && ent.r) {
          ctx.beginPath();
          ctx.arc(toCanvasX(ent.x), toCanvasY(ent.y), ent.r * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'ARC':
        if (ent.x !== undefined && ent.y !== undefined && ent.r) {
          ctx.beginPath();
          // Adjust angle for canvas Y inversion
          const start = ent.startAngle ? -ent.startAngle : 0;
          const end = ent.endAngle ? -ent.endAngle : Math.PI * 2;
          ctx.arc(toCanvasX(ent.x), toCanvasY(ent.y), ent.r * scale, end, start, true);
          ctx.stroke();
        }
        break;

      case 'TEXT':
      case 'MTEXT':
        if (ent.x !== undefined && ent.y !== undefined && ent.text) {
          const fontHeight = Math.max(9, Math.min(32, (ent.height || 2.5) * scale * 1.5));
          ctx.font = `${Math.round(fontHeight)}px monospace`;
          ctx.fillText(ent.text, toCanvasX(ent.x), toCanvasY(ent.y));
        }
        break;
    }
  }
}

/**
 * Export DXF drawing and user markup comments to a standard engineering PDF
 */
export async function exportDxfToPdf(
  dxf: DxfData,
  pins: MarkupPin[],
  fileName: string,
  projectName = 'VARD Design Project'
): Promise<void> {
  // A3 Landscape dimensions in mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  const pageW = doc.internal.pageSize.getWidth(); // 420mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Title Block Header
  doc.setDrawColor(20, 40, 70);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, pageW - 20, pageH - 20);

  // Drawing Viewport Area (Leave room for footer)
  const drawAreaW = pageW - 30;
  const drawAreaH = pageH - 45;
  const { minX, minY, width, height } = dxf.bbox;
  const scale = Math.min(drawAreaW / width, drawAreaH / height);

  const offsetX = 15 + (drawAreaW - width * scale) / 2;
  const offsetY = 15 + (drawAreaH - height * scale) / 2;

  const toPdfX = (x: number) => offsetX + (x - minX) * scale;
  const toPdfY = (y: number) => 15 + drawAreaH - ((y - minY) * scale);

  doc.setLineWidth(0.25);
  doc.setDrawColor(40, 50, 70);

  // Render DXF Entities with safety guards
  for (const ent of dxf.entities) {
    try {
      if (ent.type === 'LINE' && 
          isFinite(ent.x1 ?? NaN) && isFinite(ent.y1 ?? NaN) && 
          isFinite(ent.x2 ?? NaN) && isFinite(ent.y2 ?? NaN)) {
        doc.line(toPdfX(ent.x1!), toPdfY(ent.y1!), toPdfX(ent.x2!), toPdfY(ent.y2!));
      } else if ((ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') && ent.points && ent.points.length > 1) {
        for (let p = 1; p < ent.points.length; p++) {
          const p1 = ent.points[p - 1];
          const p2 = ent.points[p];
          if (isFinite(p1.x) && isFinite(p1.y) && isFinite(p2.x) && isFinite(p2.y)) {
            doc.line(toPdfX(p1.x), toPdfY(p1.y), toPdfX(p2.x), toPdfY(p2.y));
          }
        }
      } else if (ent.type === 'CIRCLE' && isFinite(ent.x ?? NaN) && isFinite(ent.y ?? NaN) && isFinite(ent.r ?? NaN) && (ent.r ?? 0) > 0) {
        doc.circle(toPdfX(ent.x!), toPdfY(ent.y!), ent.r! * scale);
      } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
        if (isFinite(ent.x ?? NaN) && isFinite(ent.y ?? NaN) && ent.text) {
          doc.setFontSize(7);
          const safeText = String(ent.text).substring(0, 80);
          doc.text(safeText, toPdfX(ent.x!), toPdfY(ent.y!));
        }
      }
    } catch (drawErr) {
      // Continue rendering remaining entities even if one has corrupt params
    }
  }

  // Draw Markup Comments as Red Revision Pins
  for (let idx = 0; idx < pins.length; idx++) {
    const pin = pins[idx];
    if (!isFinite(pin.x) || !isFinite(pin.y)) continue;
    const pinX = 15 + (pin.x / 100) * drawAreaW;
    const pinY = 15 + (pin.y / 100) * drawAreaH;

    // Red pinpoint circle
    doc.setFillColor(239, 68, 68);
    doc.setDrawColor(185, 28, 28);
    doc.circle(pinX, pinY, 2.8, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(String(idx + 1), pinX, pinY + 0.9, { align: 'center' });

    // Callout title
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    const safeTitle = (pin.title || `Ghi chú ${idx + 1}`).substring(0, 45);
    doc.text(`[${idx + 1}] ${safeTitle}`, pinX + 3.8, pinY);
  }

  // Footer Engineering Title Block
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.rect(10, pageH - 22, pageW - 20, 12, 'FD');

  doc.setFontSize(8);
  doc.text(`DU AN: ${projectName}`, 15, pageH - 14);
  doc.text(`BAN VE: ${fileName}`, 100, pageH - 14);
  doc.text(`DRAWN: ${dxf.drawnResult.code || 'N/A'} (${dxf.drawnResult.engineer?.name || 'VARD Engineer'})`, 220, pageH - 14);
  doc.text(`TOTAL MARKUPS: ${pins.length} REVIEWS`, 330, pageH - 14);

  // If there are review comments, add Page 2 with full comments table
  if (pins.length > 0) {
    doc.addPage('a3', 'landscape');
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`VARD PIPING ENGINEERING - REVIEW MARKUP LOG SHEET`, 15, 13);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Bản vẽ: ${fileName} | Dự án: ${projectName} | DRAWN: ${dxf.drawnResult.code || 'N/A'}`, 15, 28);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 34, pageW - 30, 9, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.text('#', 18, 40);
    doc.text('TIEU DE COMMENT', 30, 40);
    doc.text('NOI DUNG CHI TIET', 130, 40);
    doc.text('UU TIEN', 260, 40);
    doc.text('TRANG THAI', 290, 40);
    doc.text('KY SU PHU TRACH', 330, 40);

    let startY = 48;
    pins.forEach((p, i) => {
      if (startY > pageH - 20) {
        doc.addPage('a3', 'landscape');
        startY = 25;
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(15, startY + 3, pageW - 15, startY + 3);

      doc.setTextColor(239, 68, 68);
      doc.text(`[${i + 1}]`, 18, startY);
      doc.setTextColor(15, 23, 42);
      doc.text(String(p.title || '').substring(0, 50), 30, startY);
      doc.setTextColor(71, 85, 105);
      doc.text(String(p.desc || 'Khong co mo ta').substring(0, 65), 130, startY);
      doc.setTextColor(p.priority === 'high' ? 220 : 15, 38, 38);
      doc.text(p.priority.toUpperCase(), 260, startY);
      doc.setTextColor(15, 23, 42);
      doc.text(p.status.toUpperCase(), 290, startY);
      doc.text(`${p.assigneeName || 'VARD'}`, 330, startY);

      startY += 10;
    });
  }

  const cleanName = (fileName || 'drawing').replace(/\.[^/.]+$/, '');
  doc.save(`${cleanName}_reviewed.pdf`);
}

/**
 * Appends review markup comments into DXF format on a dedicated CAD layer "VARD_MARKUP_REVIEW"
 * Guarantees proper AutoCAD TABLES/LAYER section injection and CRLF/LF line ending compatibility.
 */
export function exportDxfWithMarkups(originalDxf: string, pins: MarkupPin[], dxf: DxfData): string {
  // Normalize line endings to \n for robust string operations
  const usesCrlf = originalDxf.includes('\r\n');
  let content = originalDxf.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Ensure layer VARD_MARKUP_REVIEW is properly registered in TABLES / LAYER section
  const layerDefinition = '0\nLAYER\n2\nVARD_MARKUP_REVIEW\n70\n0\n62\n1\n6\nCONTINUOUS\n';

  if (content.includes('2\nLAYER')) {
    const layerTablePos = content.indexOf('2\nLAYER');
    const endTabIdx = content.indexOf('0\nENDTAB', layerTablePos);
    if (endTabIdx !== -1 && !content.includes('2\nVARD_MARKUP_REVIEW')) {
      content = content.substring(0, endTabIdx) + layerDefinition + content.substring(endTabIdx);
    }
  } else if (content.includes('2\nTABLES')) {
    const endSecTables = content.indexOf('0\nENDSEC', content.indexOf('2\nTABLES'));
    if (endSecTables !== -1) {
      const fullTable = '0\nTABLE\n2\nLAYER\n70\n1\n' + layerDefinition + '0\nENDTAB\n';
      content = content.substring(0, endSecTables) + fullTable + content.substring(endSecTables);
    }
  }

  // 2. Build CAD entities for all review pins
  const { minX, minY, width, height } = dxf.bbox;
  let markupEntitiesDxf = '';

  pins.forEach((pin, idx) => {
    // Map percentage coordinates back to DXF coordinate space
    const safeX = isFinite(pin.x) ? pin.x : 50;
    const safeY = isFinite(pin.y) ? pin.y : 50;
    const dxfX = minX + (safeX / 100) * width;
    const dxfY = minY + (1 - safeY / 100) * height;

    const radius = Math.max(3, Math.min(width, height) * 0.025);

    // Circle at pin location on layer VARD_MARKUP_REVIEW (Color 1 = Red)
    markupEntitiesDxf += `0\nCIRCLE\n8\nVARD_MARKUP_REVIEW\n62\n1\n10\n${dxfX.toFixed(3)}\n20\n${dxfY.toFixed(3)}\n30\n0.0\n40\n${radius.toFixed(3)}\n`;

    // Text Label with comment number & title
    const textHeight = Math.max(2, radius * 0.7);
    const safeTitle = (pin.title || `Comment ${idx + 1}`).replace(/[\r\n]+/g, ' ');
    const label = `[${idx + 1}] ${safeTitle}`;
    markupEntitiesDxf += `0\nTEXT\n8\nVARD_MARKUP_REVIEW\n62\n1\n10\n${(dxfX + radius * 1.3).toFixed(3)}\n20\n${dxfY.toFixed(3)}\n30\n0.0\n40\n${textHeight.toFixed(3)}\n1\n${label}\n`;
  });

  // 3. Inject markup entities into ENTITIES section
  const endEntitiesIdx = content.lastIndexOf('0\nENDSEC');
  if (endEntitiesIdx !== -1) {
    content = content.substring(0, endEntitiesIdx) + markupEntitiesDxf + content.substring(endEntitiesIdx);
  } else {
    const eofIdx = content.lastIndexOf('0\nEOF');
    if (eofIdx !== -1) {
      content = content.substring(0, eofIdx) + '0\nSECTION\n2\nENTITIES\n' + markupEntitiesDxf + '0\nENDSEC\n' + content.substring(eofIdx);
    } else {
      content += markupEntitiesDxf;
    }
  }

  // Restore CRLF if input originally had Windows line endings
  if (usesCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }

  return content;
}

/**
 * Generates an AutoCAD-compliant DXF file for review markups from a PDF drawing
 * Ensures clicking "Xuất DWG (CAD)" when a PDF is open still exports a fully functional CAD file.
 */
export function generateCadDxfFromPdfPins(
  pins: MarkupPin[],
  fileName: string,
  drawnCode = 'VARD',
  drawnName = 'VARD Engineer'
): string {
  // A3 sheet dimensions in mm: 420 x 297
  const w = 420;
  const h = 297;

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n`;
  dxf += `0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  dxf += `0\nLAYER\n2\nVARD_MARKUP_REVIEW\n70\n0\n62\n1\n6\nCONTINUOUS\n`;
  dxf += `0\nLAYER\n2\nTITLE_BLOCK\n70\n0\n62\n4\n6\nCONTINUOUS\n`;
  dxf += `0\nENDTAB\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Sheet Border (Layer 0)
  dxf += `0\nLINE\n8\n0\n10\n10.0\n20\n10.0\n11\n410.0\n21\n10.0\n`;
  dxf += `0\nLINE\n8\n0\n10\n410.0\n20\n10.0\n11\n410.0\n21\n287.0\n`;
  dxf += `0\nLINE\n8\n0\n10\n410.0\n20\n287.0\n11\n10.0\n21\n287.0\n`;
  dxf += `0\nLINE\n8\n0\n10\n10.0\n20\n287.0\n11\n10.0\n21\n10.0\n`;

  // Title Block
  dxf += `0\nTEXT\n8\nTITLE_BLOCK\n10\n20.0\n20\n20.0\n40\n4.0\n1\nVARD DESIGN REVIEW: ${fileName}\n`;
  dxf += `0\nTEXT\n8\nTITLE_BLOCK\n10\n20.0\n20\n14.0\n40\n3.0\n1\nDRAWN: ${drawnCode} (${drawnName}) | DATE: ${new Date().toLocaleDateString()}\n`;

  // Markup Pins on VARD_MARKUP_REVIEW (Color 1 = Red)
  pins.forEach((pin, idx) => {
    // Coordinate space inside 400x267 drawing area
    const px = 10 + (pin.x / 100) * 390;
    const py = 10 + (1 - pin.y / 100) * 260;

    dxf += `0\nCIRCLE\n8\nVARD_MARKUP_REVIEW\n62\n1\n10\n${px.toFixed(2)}\n20\n${py.toFixed(2)}\n40\n5.0\n`;
    dxf += `0\nTEXT\n8\nVARD_MARKUP_REVIEW\n62\n1\n10\n${(px + 7).toFixed(2)}\n20\n${py.toFixed(2)}\n40\n3.5\n1\n[${idx + 1}] ${pin.title} (${pin.assigneeName})\n`;
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Downloads a DXF string as a .dxf file (AutoCAD native CAD exchange format)
 * Uses delayed URL revocation to prevent browser download aborts.
 */
export function downloadDxfFile(dxfContent: string, fileName: string) {
  try {
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (cleanErr) {
        // ignore
      }
    }, 1500);
  } catch (err) {
    console.error('Download DXF error:', err);
    throw err;
  }
}

