import { Plugin, PluginKey } from 'prosemirror-state';
import { v4 as uuidv4 } from 'uuid';

const idPluginKey = new PluginKey('id-plugin');

export const idPlugin = new Plugin({
    key: idPluginKey,
    appendTransaction: (transactions, oldState, newState) => {
        const tr = newState.tr;
        let modified = false;
        newState.doc.descendants((node, pos) => {
            if (node.type.spec.attrs?.['id'] && !node.attrs['id']) {
                console.log('node', node);
                tr.setNodeMarkup(pos, null, { ...node.attrs, id: uuidv4() });
                modified = true;
            }
        });

        return modified ? tr : null;
    },
});
