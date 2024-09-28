//@ts-nocheck
import { Plugin, PluginKey } from 'prosemirror-state'
import { Schema, NodeSpec } from 'prosemirror-model'

// Define alignment types
type Alignment = 'left' | 'center' | 'right' | 'justify'

// Helper function to create a command that sets the alignment
function setAlignment(alignment: Alignment) {
    return (state, dispatch) => {
        const { from, to } = state.selection
        const tr = state.tr

        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                tr.setNodeMarkup(pos, null, { ...node.attrs, align: alignment })
            }
        })

        if (dispatch) dispatch(tr)
        return true
    }
}

// Create the justify plugin
export function justifyPlugin() {
    return new Plugin({
        key: new PluginKey('justify'),
        props: {
            // Plugin properties here if needed
        }
    })
}

export const alignLeft = setAlignment('left')
export const alignCenter = setAlignment('center')
export const alignRight = setAlignment('right')
export const alignJustify = setAlignment('justify')