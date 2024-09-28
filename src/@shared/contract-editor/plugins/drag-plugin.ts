import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { Selection } from "prosemirror-state"

const dragPluginKey = new PluginKey("dragPlugin")

const createDragElement = () => {
    const dragContainer = document.createElement('span')
    dragContainer.classList.add('drag-handle-container')
    // dragContainer.classList.add('bg-gray-500')
    // dragContainer.classList.add('border-2')
    // dragContainer.setAttribute('style', `visibility: hidden;`)
    const dragEl = document.createElement('div')
    // dragEl.classList.add('drag-handle')
    // dragEl.classList.add('p-3')
    // dragEl.classList.add('border-2')
    dragEl.innerHTML = '<span class="m-1 material-icons-outlined">drag_indicator</span>'
    dragContainer.insertBefore(dragEl, null)
    return dragContainer
}

const createDragDecorations = (doc: ProseMirrorNode, selection: Selection) => {
    const decorations: Decoration[] = []

    doc.forEach((node, pos) => {
        if (node.isBlock && node.content.size > 0) {
            const isSelected = selection.from > pos && selection.to <= (pos + node.nodeSize)
            if (isSelected) {
                decorations.push(
                    Decoration.widget(pos, createDragElement, {
                        side: -1,
                        key: `drag-${pos}`,
                        ignoreMutation: () => true,
                    })
                )
            }
        }
    })

    return DecorationSet.create(doc, decorations)
}

export const dragElementPlugin = () =>
    new Plugin({
        key: dragPluginKey,
        state: {
            init(_, { doc, selection }) {
                return createDragDecorations(doc, selection)
            },
            apply(tr, oldState, _, newState) {
                if (tr.selectionSet) {
                    console.log('Node selected:', newState.selection.toJSON())
                }
                return tr.docChanged || tr.selectionSet
                    ? createDragDecorations(tr.doc, newState.selection)
                    : oldState
            }
        },
        props: {
            decorations(state) {
                return this.getState(state)
            },
            handleDOMEvents: {
                mousedown: (view, event) => {
                    if ((event.target as HTMLElement).classList.contains('drag-handle')) {
                        event.preventDefault()
                        const pos = view.posAtDOM(event.target as HTMLElement, 0)
                        const $pos = view.state.doc.resolve(pos)
                        const node = $pos.node()

                        let startPos = $pos.before()

                        const mousemove = (e: MouseEvent) => {
                            const targetPos = view.posAtCoords({ left: e.clientX, top: e.clientY })
                            if (targetPos && targetPos.pos !== startPos) {
                                const tr = view.state.tr
                                tr.delete(startPos, startPos + node.nodeSize)
                                tr.insert(targetPos.pos, node)
                                view.dispatch(tr)
                                startPos = targetPos.pos
                            }
                        }

                        const mouseup = () => {
                            document.removeEventListener('mousemove', mousemove)
                            document.removeEventListener('mouseup', mouseup)
                        }

                        document.addEventListener('mousemove', mousemove)
                        document.addEventListener('mouseup', mouseup)

                        return true
                    }
                    return false
                }
            }
        },
    })