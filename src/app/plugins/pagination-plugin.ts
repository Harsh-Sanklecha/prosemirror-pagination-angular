import { Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const FOOTER_HEIGHT = 60; // in pixels
const HEADER_HEIGHT = 60; // in pixels, adjust if needed
const TOTAL_HEIGHT = 366; // total available height in pixels
const CONTENT_HEIGHT = TOTAL_HEIGHT - FOOTER_HEIGHT - HEADER_HEIGHT; // 246px

// Optional: Define approximate node heights for estimation
const APPROX_PARAGRAPH_HEIGHT = 24; // in pixels, adjust based on actual rendering


export const paginationPlugin = new Plugin({
    view(editorView) {
        
        const checkAndPaginate = () => {
            const { state, dispatch } = editorView;
            let tr = state.tr

            let paraNode!: any
            let paraPos!: any

            let currentPagePos: number | null = null;

            state.doc.descendants((node, pos) => {
                if (node.type.name === 'page' && currentPagePos === null) {
                    if (state.selection.from >= pos && state.selection.from < pos + node.nodeSize) {
                        currentPagePos = pos; // Save the position of the current page
                    }
                }
                if (!paraNode && node.type.name === 'paragraph') {
                    paraNode = node
                    paraPos = pos
                }
            })

            if (currentPagePos !== null) { 
                const currentPageNode = tr.doc.nodeAt(currentPagePos);
                if (!currentPageNode) return;

                const nextPagePos = currentPagePos + currentPageNode.nodeSize

                let nextPageNode = tr.doc.nodeAt(nextPagePos)
                if(!nextPageNode) {
                    tr = addNewPage(editorView, tr)
                }

                const updatedNextPagePos = currentPagePos + currentPageNode.nodeSize;
                nextPageNode = tr.doc.nodeAt(updatedNextPagePos);

                if (nextPageNode && paraNode && paraPos !== null) {
                    const headerNode = nextPageNode.child(0);

                    const contentPos = nextPagePos + 2 + headerNode.nodeSize

                    tr = tr.insert(contentPos, paraNode); // Insert the paragraph at the start of the next page
                    tr = tr.delete(paraPos, paraPos + paraNode.nodeSize); // Remove the paragraph from the current page
                    dispatch(tr);
                    console.log(paraNode);
                }
            }
        };

        editorView.dom.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                checkAndPaginate();
            }
        });

        return {
            destroy() {
                editorView.dom.removeEventListener('keydown', checkAndPaginate);
            }
        };
    }
});
const addNewPage = (editorView: EditorView, tr: Transaction) => {
    const { state } = editorView;
    const pageNode = state.schema.nodes['page'].create({}, [
        state.schema.nodes['header'].create({}, state.schema.nodes['paragraph'].create()),
        state.schema.nodes['content'].create({}, state.schema.nodes['paragraph'].create()),
        state.schema.nodes['footer'].create({}, state.schema.nodes['paragraph'].create())
    ]);
    tr.insert(tr.doc.content.size, pageNode);  // Insert the page at the start
    return tr
}
