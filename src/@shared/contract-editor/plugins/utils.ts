// @ts-nocheck

import { wrapIn, setBlockType } from 'prosemirror-commands'
import { NodeType } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { splitListItem, toggleList } from "prosemirror-schema-list";
import { wrapInList, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { CdkObserveContent } from '@angular/cdk/observers';
import { keymap } from 'prosemirror-keymap';
import { schema } from 'prosemirror-schema-basic';
import { TextSelection } from 'prosemirror-state';

export function toggleList(listType: NodeType) {
    return (state: EditorState, dispatch: any) => {
        console.log('toggleList', listType);

        const { schema } = state;
        const { bullet_list, ordered_list, list_item } = schema.nodes;

        const isListActive = state.selection.$from
            .sharedDepth(state.selection.to) >= 2;

        if (isListActive) {
            const result = liftListItem(list_item)(state, dispatch);
            return result;
        } else {
            const result = wrapIn(listType)(state, dispatch);
            return result;
        }
    };
}


export function toggleBlockquote(blockquoteType: NodeType) {
    return (state: EditorState, dispatch: any) => {
        const { selection } = state;
        const { $from, $to } = selection;
        const blockquoteNode = findParentNodeOfType(blockquoteType)(selection);

        if (blockquoteNode) {
            if (dispatch) {
                dispatch(state.tr.lift($from.blockRange($to), 0));
            }
            return true;
        } else {
            // Otherwise, wrap the selection in the blockquote
            const result = wrapIn(blockquoteType)(state, dispatch);
            return result;
        }
    };
}

function findParentNodeOfType(nodeType: NodeType) {
    return (selection: any) => {
        const { $from } = selection;
        for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type === nodeType) {
                return node;
            }
        }
        return null;
    };
}

export const listKeymap = keymap({
    Enter: (state, dispatch, view) => {
        const { $from } = state.selection
        for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            if (node.type.name === 'list_item') {
                return splitListItem(state.schema.nodes['list_item'])(state, dispatch)
            }
        }
        return false
    }
})


export const addPageBreak = (state: EditorState, dispatch: any) => {

    const { tr } = state;
    const pageBreak = state.schema.nodes['hard_break'].create();
    const { selection } = state;
    const { $from, $to } = selection;

    tr.insert($from.pos, pageBreak);
    tr.setSelection(TextSelection.near(tr.doc.resolve($from.pos + 1)));
    dispatch(tr);
    return true;
}

export const validateEmail = (email: string) => {
    return email.match(/^[a-z0-9._%+-]+@[a-z0-9._%+-]+\.[a-z]{2,4}/);
}
