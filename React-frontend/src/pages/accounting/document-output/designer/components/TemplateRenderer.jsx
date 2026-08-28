import * as React from 'react';

/**
 * The React half of the "one schema, two renderers" pair — renders an
 * already-resolved render model (the exact `{pages, page, dto, layout}`
 * shape returned by `previewWithConfig`/`preview`, i.e. what PHP's
 * `CanvasHtmlRenderer` + `HtmlOutputAdapter::buildCanvasHtml()` produce)
 * as absolutely-positioned DOM/CSS, using millimeters for every
 * coordinate exactly like the PHP side — no px conversion, so there is
 * no unit-rounding drift between what the designer/preview shows and
 * what dompdf prints.
 *
 * Every style property this component understands must be understood
 * identically by `CanvasHtmlRenderer`'s formal renderer specification
 * (position/size/opacity/typography/color/padding/border/overflow) —
 * see that class's docblock and the approved plan's §5.
 */

function spacingCss(padding) {
  if (padding == null) return undefined;
  if (typeof padding === 'object') {
    const t = Number(padding.top ?? 0);
    const r = Number(padding.right ?? 0);
    const b = Number(padding.bottom ?? 0);
    const l = Number(padding.left ?? 0);
    return `${t}mm ${r}mm ${b}mm ${l}mm`;
  }
  return `${Number(padding)}mm`;
}

function boxStyle(style = {}) {
  const css = {};
  if (style.fontFamily) css.fontFamily = `${style.fontFamily}, DejaVu Sans, Helvetica, Arial, sans-serif`;
  if (style.fontSize != null) css.fontSize = `${Number(style.fontSize)}pt`;
  if (style.fontWeight === 'bold') css.fontWeight = 'bold';
  if (style.italic) css.fontStyle = 'italic';
  if (style.underline) css.textDecoration = 'underline';
  if (style.align) css.textAlign = style.align;
  if (style.color) css.color = style.color;
  if (style.background && style.background !== 'none') css.backgroundColor = style.background;
  if (style.letterSpacing != null) css.letterSpacing = `${Number(style.letterSpacing)}mm`;
  if (style.lineHeight != null) css.lineHeight = Number(style.lineHeight);
  if (style.padding != null) css.padding = spacingCss(style.padding);
  if (style.border && typeof style.border === 'object') {
    const bw = Number(style.border.width_mm ?? 0.2);
    if (bw > 0) css.border = `${bw}mm ${style.border.style ?? 'solid'} ${style.border.color ?? '#000000'}`;
  }
  if (style.borderRadius != null) css.borderRadius = `${Number(style.borderRadius)}mm`;
  if (style.overflow === 'clip') {
    css.overflow = 'hidden';
    css.whiteSpace = 'nowrap';
  } else if (style.overflow === 'ellipsis') {
    css.overflow = 'hidden';
    css.whiteSpace = 'nowrap';
    css.textOverflow = 'ellipsis';
  } else if (style.overflow === 'wrap') {
    css.overflow = 'hidden';
    css.whiteSpace = 'normal';
    css.wordWrap = 'break-word';
  }
  return css;
}

/** Renders the visual content of one resolved element — shared between the read-only preview and the designer canvas's background layer. */
export function ElementBox({ element, interactive = false, onClick, className, style: extraStyle }) {
  const el = element;
  if (el.hidden) return null;

  const w = Number(el.w) || 0;
  const h = Number(el.h) || 0;
  const opacity = el.opacity != null ? Number(el.opacity) : 1;
  const elStyle = el.style || {};

  const positionStyle = {
    position: 'absolute',
    left: `${Number(el.x) || 0}mm`,
    top: `${Number(el.y) || 0}mm`,
    width: `${w}mm`,
    ...(h > 0 ? { height: `${h}mm` } : {}),
    ...(opacity < 1 ? { opacity } : {}),
    ...boxStyle(elStyle),
    ...extraStyle,
  };

  const handleClick = interactive
    ? (e) => {
        e.stopPropagation();
        onClick?.(el);
      }
    : undefined;

  switch (el.type) {
    case 'text':
      return (
        <div
          className={className}
          style={{ ...positionStyle, userSelect: 'none', WebkitUserSelect: 'none' }}
          onClick={handleClick}
          // Server-resolved `content` is already HTML-escaped (literal text
          // and interpolated token values alike) — see FieldResolver::interpolate().
          dangerouslySetInnerHTML={{ __html: el.content ?? '' }}
        />
      );
    case 'field': {
      const layout =
        el.label_layout === 'columns' || el.style?.label_layout === 'columns' ? 'columns' : 'inline';
      const rawLabel = el.label != null ? String(el.label) : '';
      const columnLabel = rawLabel.replace(/\s*:\s*$/, '');
      const labelWidthMm = Number(el.label_width_mm) > 0 ? Number(el.label_width_mm) : 32;
      // Designer canvas overrides box size in px — keep label column in the same unit.
      const parentWidth = String(positionStyle.width || '');
      const labelWidthCss = parentWidth.endsWith('px')
        ? `${(labelWidthMm * 96) / 25.4}px`
        : `${labelWidthMm}mm`;
      const sepCss = parentWidth.endsWith('px') ? { margin: '0 6px' } : { margin: '0 1.5mm' };

      if (layout === 'columns' && columnLabel) {
        return (
          <div
            className={className}
            style={{
              ...positionStyle,
              display: 'flex',
              alignItems: 'baseline',
              width: positionStyle.width || '100%',
              boxSizing: 'border-box',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onClick={handleClick}
          >
            <span
              className="text-muted-foreground"
              style={{
                flex: `0 0 ${labelWidthCss}`,
                width: labelWidthCss,
                maxWidth: labelWidthCss,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {columnLabel}
            </span>
            <span className="text-muted-foreground" style={{ flex: '0 0 auto', ...sepCss }}>
              :
            </span>
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>{el.value}</span>
          </div>
        );
      }

      return (
        <div
          className={className}
          style={{ ...positionStyle, userSelect: 'none', WebkitUserSelect: 'none' }}
          onClick={handleClick}
        >
          {rawLabel ? <span className="text-muted-foreground">{rawLabel} </span> : null}
          <span>{el.value}</span>
        </div>
      );
    }
    case 'image':
      return (
        <img
          className={className}
          src={el.src || undefined}
          alt=""
          draggable={false}
          style={{
            ...positionStyle,
            objectFit: elStyle.objectFit || el.objectFit || 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitUserDrag: 'none',
          }}
          onClick={handleClick}
          onDragStart={(e) => e.preventDefault()}
        />
      );
    case 'line': {
      const isVertical = h > w;
      const sw = Number(elStyle.strokeWidth ?? 0.3);
      const color = elStyle.color || '#000000';
      return (
        <div
          className={className}
          style={{
            ...positionStyle,
            ...(isVertical ? { borderLeft: `${sw}mm solid ${color}` } : { borderTop: `${sw}mm solid ${color}` }),
          }}
          onClick={handleClick}
        />
      );
    }
    case 'rect':
      return (
        <div
          className={className}
          style={{
            ...positionStyle,
            width: '100%',
            height: '100%',
            backgroundColor: elStyle.fill && elStyle.fill !== 'none' ? elStyle.fill : undefined,
          }}
          onClick={handleClick}
        />
      );
    case 'totals_block':
      return (
        <div className={className} style={positionStyle} onClick={handleClick}>
          {(el.rows || []).map((row, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          {el.highlightRow && (
            <div className="mt-1 flex justify-between border-t border-current pt-1 font-bold">
              <span>{el.highlightRow.label}</span>
              <span>{el.highlightRow.value}</span>
            </div>
          )}
        </div>
      );
    case 'items_table_rows':
      return (
        <table
          className={className}
          style={{
            position: 'absolute',
            left: `${Number(el.x) || 0}mm`,
            top: `${Number(el.y) || 0}mm`,
            width: `${w}mm`,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            ...extraStyle,
          }}
          onClick={handleClick}
        >
          <colgroup>
            {(el.columns || []).map((c, i) => (
              <col key={i} style={{ width: `${Number(c.width_pct) || 10}%` }} />
            ))}
          </colgroup>
          {el.showHeader && (
            <thead>
              <tr style={{ height: `${Number(el.headerHeight) || 8}mm` }}>
                {(el.columns || []).map((c, i) => (
                  <th key={i} style={{ textAlign: c.align || 'left', padding: '1mm 1.5mm', verticalAlign: 'middle' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {(el.rows || []).map((row, ri) => (
              <tr key={ri} style={{ height: `${Number(el.rowHeights?.[ri]) || 8}mm` }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ textAlign: cell.align || 'left', padding: '1mm 1.5mm', verticalAlign: 'top', overflow: 'hidden' }}>
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}

/**
 * Read-only, multi-page renderer for a resolved render model — used by
 * the Preview Invoice dialog. `pageIndex` restricts display to a single
 * page (used by CanvasPage's live-edit background layer, which only
 * ever shows page 1 while editing).
 */
export function TemplateRenderer({ renderModel, pageIndex = null, className }) {
  if (!renderModel?.pages?.length) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Nothing to render yet.</div>;
  }

  const page = renderModel.page || { width_mm: 210, height_mm: 297 };
  const pages = pageIndex == null ? renderModel.pages : [renderModel.pages[pageIndex]].filter(Boolean);

  return (
    <div className={className}>
      {pages.map((p, i) => (
        <div
          key={i}
          className="relative mx-auto mb-4 overflow-hidden bg-white text-black shadow-md last:mb-0"
          style={{ width: `${page.width_mm}mm`, height: `${page.height_mm}mm` }}
        >
          {(p.elements || [])
            .slice()
            .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
            .map((el) => (
              <ElementBox key={el.id} element={el} />
            ))}
        </div>
      ))}
    </div>
  );
}
