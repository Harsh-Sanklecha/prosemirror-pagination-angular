import { Schema, NodeSpec, MarkSpec, DOMOutputSpec } from "prosemirror-model"
import { tableNodes } from "prosemirror-tables";

const pDOM: DOMOutputSpec = ["p", 0]
const blockquoteDOM: DOMOutputSpec = ["blockquote", 0]
const hrDOM: DOMOutputSpec = ["hr", 0]
const preDOM: DOMOutputSpec = ["pre", ["code", 0]]
const brDOM: DOMOutputSpec = ["br"]
const emDOM: DOMOutputSpec = ["em", 0]
const strongDOM: DOMOutputSpec = ["strong", 0]
const codeDOM: DOMOutputSpec = ["code", 0]

/// [Specs](#model.NodeSpec) for the nodes defined in this schema.
export const baseNodes = {
    /// NodeSpec The top level document node.
    doc: {
        content: "block+"
    } as NodeSpec,

    /// A plain paragraph textblock. Represented in the DOM
    /// as a `<p>` element.
    paragraph: {
        attrs: { align: { default: 'left' }, id: { default: null } },
        content: "inline*",
        group: "block",
        parseDOM: [
            {
                tag: 'p',
                getAttrs(dom: HTMLElement) {
                    const align = dom.style.textAlign || 'left'
                    return { align }
                }
            }
        ],
        toDOM(node: any) {
            const align = node.attrs.align || 'justify'
            const domAttrs: any = { style: `text-align: ${align}` }
            return ['p', domAttrs, 0]
        }
    } as NodeSpec,

    /// A blockquote (`<blockquote>`) wrapping one or more blocks.
    blockquote: {
        content: "block+",
        group: "block",
        defining: true,
        parseDOM: [{ tag: "blockquote" }],
        toDOM() { return blockquoteDOM }
    } as NodeSpec,

    /// A horizontal rule (`<hr>`).
    horizontal_rule: {
        group: "block",
        parseDOM: [{ tag: "hr" }],
        toDOM() { return hrDOM }
    } as NodeSpec,

    /// A heading textblock, with a `level` attribute that
    /// should hold the number 1 to 6. Parsed and serialized as `<h1>` to
    /// `<h6>` elements.
    heading: {
        attrs: {
            level: { default: 1, validate: "number" },
            align: { default: 'left' }
        },
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: [
            { tag: "h1", attrs: { level: 1 } },
            { tag: "h2", attrs: { level: 2 } },
            { tag: "h3", attrs: { level: 3 } },
            { tag: "h4", attrs: { level: 4 } },
            { tag: "h5", attrs: { level: 5 } },
            { tag: "h6", attrs: { level: 6 } }
        ].map(spec => ({
            ...spec,
            getAttrs(dom: HTMLElement) {
                return {
                    level: spec.attrs.level,
                    align: dom.style.textAlign || 'left'
                }
            }
        })),
        toDOM(node: any) {
            const align = node.attrs.align || 'left'
            return ["h" + node.attrs.level, {
                style: `text-align: ${align}`
            }, 0]
        }
    } as NodeSpec,

    /// A code listing. Disallows marks or non-text inline
    /// nodes by default. Represented as a `<pre>` element with a
    /// `<code>` element inside of it.
    code_block: {
        content: "text*",
        marks: "",
        group: "block",
        code: true,
        defining: true,
        parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
        toDOM() { return preDOM }
    } as NodeSpec,

    /// The text node.
    text: {
        group: "inline"
    } as NodeSpec,

    /// An inline image (`<img>`) node. Supports `src`,
    /// `alt`, and `href` attributes. The latter two default to the empty
    /// string.
    image: {
        inline: true,
        attrs: {
            src: { validate: "string" },
            alt: { default: null, validate: "string|null" },
            title: { default: null, validate: "string|null" }
        },
        group: "inline",
        parseDOM: [{
            tag: "img[src]", getAttrs(dom: HTMLElement) {
                return {
                    src: dom.getAttribute("src"),
                    title: dom.getAttribute("title"),
                    alt: dom.getAttribute("alt")
                }
            }
        }],
        toDOM(node) { let { src, alt, title } = node.attrs; return ["img", { src, alt, title }] }
    } as NodeSpec,

    /// A hard line break, represented in the DOM as `<br>`.
    hard_break: {
        inline: true,
        group: "inline",
        selectable: false,
        parseDOM: [{ tag: "br" }],
        toDOM() {
            return ["div", {
                class: "page-break",
                style: `break-after:page`
            }, 0]
        }
    } as NodeSpec,

    list_item: {
        content: "paragraph block*",
        defining: true,
        parseDOM: [{ tag: "li" }],
        toDOM() { return ["li", 0] }
    } as NodeSpec,

    ordered_list: {
        content: "list_item+",
        group: "block",
        parseDOM: [{ tag: "ol" }],
        toDOM() { return ["ol", 0] }
    } as NodeSpec,

    bullet_list: {
        content: "list_item+",
        group: "block",
        parseDOM: [{ tag: "ul" }],
        toDOM() { return ["ul", 0] }
    } as NodeSpec,

    // Add table nodes
    ...tableNodes({
        tableGroup: "block",
        cellContent: "block+",
        cellAttributes: {
            background: {
                default: null,
                getFromDOM(dom) { return dom.style.backgroundColor || null },
                setDOMAttr(value, attrs) { if (value) attrs['style'] = (attrs['style'] || '') + `background-color: ${value};` }
            }
        }
    })
}

const nodes = Object.entries(baseNodes).reduce((acc, [key, node]) => {
    if (key !== 'text' && node.group === 'block') {
        (acc as any)[key] = {
            ...node,
            attrs: {
                ...(node.attrs || {}),
                id: { default: null }
            },
            toDOM(n: any) {
                const originalDOM = node.toDOM ? node.toDOM(n) : [key, 0];
                if (Array.isArray(originalDOM)) {
                    if (typeof originalDOM[1] === 'object') {
                        (originalDOM[1] as any)['id'] = n.attrs.id;
                    } else {
                        originalDOM.splice(1, 0, { 'id': n.attrs.id } as any);
                    }
                }
                return originalDOM as DOMOutputSpec;
            }
        };
    } else {
        (acc as any)[key] = node;
    }
    return acc;
}, {} as typeof baseNodes);

/// [Specs](#model.MarkSpec) for the marks in the schema.
export const marks = {
    /// A link. Has `href` and `title` attributes. `title`
    /// defaults to the empty string. Rendered and parsed as an `<a>`
    /// element.
    link: {
        attrs: {
            href: { validate: "string" },
            title: { default: null, validate: "string|null" }
        },
        inclusive: false,
        parseDOM: [{
            tag: "a[href]", getAttrs(dom: HTMLElement) {
                return { href: dom.getAttribute("href"), title: dom.getAttribute("title") }
            }
        }],
        toDOM(node) { let { href, title } = node.attrs; return ["a", { href, title }, 0] }
    } as MarkSpec,

    /// An emphasis mark. Rendered as an `<em>` element. Has parse rules
    /// that also match `<i>` and `font-style: italic`.
    em: {
        parseDOM: [
            { tag: "i" }, { tag: "em" },
            { style: "font-style=italic" },
            { style: "font-style=normal", clearMark: m => m.type.name == "em" }
        ],
        toDOM() { return emDOM }
    } as MarkSpec,

    underline: {
        parseDOM: [
            { tag: "u" }, // Match <u> tags
            { style: "text-decoration=underline" } // Match inline styles
        ],
        toDOM() {
            return ["u", 0]; // Serialize as <u>...</u>
        }
    } as MarkSpec,

    /// A strong mark. Rendered as `<strong>`, parse rules also match
    /// `<b>` and `font-weight: bold`.
    strong: {
        parseDOM: [
            { tag: "strong" },
            { tag: "b", getAttrs: (node: HTMLElement) => node.style.fontWeight != "normal" && null },
            { style: "font-weight=400", clearMark: m => m.type.name == "strong" },
            { style: "font-weight", getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
        ],
        toDOM() { return strongDOM }
    } as MarkSpec,

    strikethrough: {
        parseDOM: [
            { tag: "s" }, // Match <s> tags
            { tag: "del" }, // Match <del> tags
            { style: "text-decoration=line-through" }
        ],
        toDOM() {
            return ["s", 0];
        }
    } as MarkSpec,

    /// Code font mark. Represented as a `<code>` element.
    code: {
        parseDOM: [{ tag: "code" }],
        toDOM() { return codeDOM }
    } as MarkSpec,

    comment: {
        attrs: {
            id: {},
            color: { default: '' },  // Store color attribute
        },
        inclusive: false,
        parseDOM: [
            {
                tag: "span[data-comment-id]",
                getAttrs: (dom: HTMLElement) => ({
                    id: dom.getAttribute("data-comment-id"),
                    color: dom.getAttribute("data-comment-color") || '',  // Parse the color from the DOM
                }),
            },
        ],
        toDOM: (mark: any) => [
            "span",
            {
                "data-comment-id": mark.attrs.id,
                "data-comment-color": mark.attrs.color,  // Store the color in the attribute
                class: "comment",  // Assign the 'comment' class
                style: `--comment-bgcolor: ${mark.attrs.color};`,  // Set CSS variable for the background color
            },
            0,
        ],
    } as MarkSpec,
}

export const schema: Schema = new Schema({ nodes: nodes, marks })