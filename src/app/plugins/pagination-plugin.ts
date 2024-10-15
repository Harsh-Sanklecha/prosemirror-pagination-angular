import { Plugin, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const FOOTER_HEIGHT = 60; // in pixels
const HEADER_HEIGHT = 60; // in pixels, adjust if needed
const TOTAL_HEIGHT = 365; // total available height in pixels
const CONTENT_HEIGHT = TOTAL_HEIGHT - FOOTER_HEIGHT - HEADER_HEIGHT; // 246px

// Optional: Define approximate node heights for estimation
const APPROX_PARAGRAPH_HEIGHT = 24; // in pixels, adjust based on actual rendering


export const paginationPlugin = new Plugin({
    view(editorView) {
        
        const checkAndPaginate = () => {
            const { state, dispatch, dom } = editorView;
            let tr = state.tr

            let currentPagePos: number | null = null;

            state.doc.descendants((node, pos) => {
                if (node.type.name === 'page') {
                    const domAtPos = editorView.domAtPos(pos + 1)
                    const pageElement = domAtPos.node as HTMLElement;
                    const contentElement = pageElement.querySelector('.content')

                    if (!contentElement) return

                    const isOverflowing = contentElement.scrollHeight >= CONTENT_HEIGHT;
                    if (isOverflowing) {
                        const paragraphElements = Array.from(contentElement.querySelectorAll('p') as NodeListOf<HTMLElement>)

                        let contentHeight = 0;
                        let overflowingNodes: any[] = [];
                        paragraphElements.forEach((paragraphElement) => {
                            contentHeight += paragraphElement.getBoundingClientRect().height

                            if (contentHeight >= CONTENT_HEIGHT) {
                                const paraPos = editorView.posAtDOM(paragraphElement, 0);
                                const node = tr.doc.nodeAt(paraPos - 1);
                                overflowingNodes.push({
                                    node,
                                    paraPos
                                })
                            }

                        })

                        currentPagePos = pos; // Save the position of the current page

                        if (overflowingNodes.length && currentPagePos !== null) {
                            const currentPageNode = tr.doc.nodeAt(currentPagePos);
                            if (!currentPageNode) return;

                            const nextPagePos = currentPagePos + currentPageNode.nodeSize

                            let nextPageNode = tr.doc.nodeAt(nextPagePos)
                            if (!nextPageNode) {
                                tr = addNewPage(editorView, tr)
                            }

                            const updatedNextPagePos = currentPagePos + currentPageNode.nodeSize;
                            nextPageNode = tr.doc.nodeAt(updatedNextPagePos);

                            if (nextPageNode) {
                                const headerNode = nextPageNode.child(0);

                                const contentPos = nextPagePos + 2

                                const lastOverflowingNode = overflowingNodes[overflowingNodes.length - 1]
                                tr = tr.insert(contentPos, lastOverflowingNode.node); // Insert the paragraph at the start of the next page
                                tr = tr.delete(lastOverflowingNode.paraPos, lastOverflowingNode.paraPos + lastOverflowingNode.node.nodeSize); // Remove the paragraph from the current page
                            }
                            dispatch(tr);
                        }
                    }
                }
            })

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
        // state.schema.nodes['header'].create({}),
        state.schema.nodes['content'].create({}),
        // state.schema.nodes['footer'].create({})
    ]);
    tr.insert(tr.doc.content.size, pageNode);  // Insert the page at the start
    return tr
}
