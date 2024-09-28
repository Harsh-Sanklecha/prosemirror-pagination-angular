import { Component, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone, signal, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { baseKeymap, setBlockType, toggleMark } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from "prosemirror-keymap";
import { DOMSerializer, Mark, MarkType, NodeType, DOMParser as ProseDOMParser } from 'prosemirror-model';
import { EditorState, NodeSelection, Plugin, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { MARKS } from './contract-editor.model';
import { alignCenter, alignJustify, alignLeft, alignRight } from './plugins/justify-plugin';
import { schema } from './plugins/schema';


import { dropCursor } from 'prosemirror-dropcursor';
import { addPageBreak, listKeymap, toggleBlockquote, toggleList } from './plugins/utils';




import { dragElementPlugin } from './plugins/drag-plugin';


import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem } from 'primeng/api';

import { addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, deleteColumn, deleteRow, deleteTable, mergeCells, setCellAttr, splitCell, tableEditing, toggleHeaderCell, toggleHeaderColumn, toggleHeaderRow } from 'prosemirror-tables';
import { MenubarModule } from 'primeng/menubar';
import { idPlugin } from './plugins/id-plugin';
import { SidebarModule } from 'primeng/sidebar';



@Component({
  selector: 'app-contract-editor',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, DropdownModule, ConfirmDialogModule,
    MenubarModule, SidebarModule
  ],
  templateUrl: './contract-editor.component.html',
  styleUrls: ['./contract-editor.component.scss'],
  providers: [ConfirmationService]
})
export class ContractEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') private editorContainer!: ElementRef;
  @ViewChild('overlayMenu') private overlayMenuRef!: ElementRef;
  @ViewChild('dragHand') private dragHand!: ElementRef;

  @Input() contractId: string = ''
  @Input() roomName: string = 'contract-management'
  @Input() needApproval: boolean = false
  @Output() needApprovalChange = new EventEmitter<boolean>();


  @Input() canEdit: boolean = true
  @Input() canComment: boolean = true
  @Input() canView: boolean = true
  @Input() isOwner: boolean = true


  user: any = {
    colorCode: '#000000',
    image: 'https://primefaces.org/primeng/assets/images/avatar/avatar-m.png'
  }
  MARKS = MARKS
  customSchema = schema;
  showOverlay = false;
  overlayTop = 0;
  overlayLeft = 0;
  dragHandTop = 0;
  dragHandLeft = 0;

  dragFocus: boolean = false;
  editorFocus: boolean = false;
  private view !: EditorView;




  headingOptions = [
    { name: 'Heading 1', code: 1 },
    { name: 'Heading 2', code: 2 },
    { name: 'Heading 3', code: 3 },
    { name: 'Heading 4', code: 4 },
    { name: 'Heading 5', code: 5 },
    { name: 'Heading 6', code: 6 },
    { name: 'Normal Text', code: 'Paragraph' }
  ]
  activeHeading: Record<string, string | number> = { name: 'Normal Text', code: 'Paragraph' }
  headings: any[] = []

  tableMenu: MenuItem[] = [
    {
      label: 'Table',
      items: [
        {
          label: 'Insert table',
          command: () => { this.insertTable() }
        },
        {
          label: 'Insert column before',
          command: () => { addColumnBefore(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Insert column after',
          command: () => { addColumnAfter(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Delete column',
          command: () => { deleteColumn(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Insert row before',
          command: () => { addRowBefore(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Insert row after',
          command: () => { addRowAfter(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Delete row',
          command: () => { deleteRow(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Delete table',
          command: () => { deleteTable(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Merge cells',
          command: () => { mergeCells(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Split cell',
          command: () => { splitCell(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Toggle header column',
          command: () => { toggleHeaderColumn(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Toggle header row',
          command: () => { toggleHeaderRow(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Toggle header cells',
          command: () => { toggleHeaderCell(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Make cell green',
          command: () => { setCellAttr("background", "#dfd")(this.view.state, this.view.dispatch) }
        },
        {
          label: 'Make cell not-green',
          command: () => { setCellAttr("background", null)(this.view.state, this.view.dispatch) }
        }
      ]
    }
  ];



  dummyDocument = schema.node("doc", null, [
    schema.node("heading", { level: 1 }, [schema.text("[NDA] American Express Document")]),
    schema.node("paragraph", { align: 'justify' }, [schema.text("Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia, molestiae quas vel sint commodi repudiandae consequuntur voluptatum laborum numquam blanditiis harum quisquam eius sed odit fugiat iusto fuga praesentium optio, eaque rerum! Provident similique accusantium nemo autem. Veritatis obcaecati tenetur iure eius earum ut molestias architecto voluptate aliquam nihil, eveniet aliquid culpa officia aut! Impedit sit sunt quaerat, odit, tenetur error, harum nesciunt ipsum debitis quas aliquid. Reprehenderit, quia. Quo neque error repudiandae fuga? Ipsa laudantium molestias eos sapiente officiis modi at sunt excepturi expedita sint? Sed quibusdam recusandae alias error harum maxime adipisci amet laborum. Perspiciatis minima nesciunt dolorem! Officiis iure rerum voluptates a cumque velit quibusdam sed amet tempora. Sit laborum ab, eius fugit doloribus tenetur fugiat, temporibus enim commodi iusto libero magni deleniti quod quam consequuntur! Commodi minima excepturi repudiandae velit hic maxime doloremque. Quaerat provident commodi consectetur veniam similique ad earum omnis ipsum saepe, voluptas, hic voluptates pariatur est explicabo fugiat, dolorum eligendi quam cupiditate excepturi mollitia maiores labore suscipit quas? Nulla, placeat. Voluptatem quaerat non architecto ab laudantium modi minima sunt esse temporibus sint culpa, recusandae aliquam numquam totam ratione voluptas quod exercitationem fuga. Possimus quis earum veniam quasi aliquam eligendi, placeat qui corporis!Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia,")]),
    schema.node("paragraph", { align: 'justify' }, [schema.text("Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia, molestiae quas vel sint commodi repudiandae consequuntur voluptatum laborum numquam blanditiis harum quisquam eius sed odit fugiat iusto fuga praesentium optio, eaque rerum! Provident similique accusantium nemo autem. Veritatis obcaecati tenetur iure eius earum ut molestias architecto voluptate aliquam nihil, eveniet aliquid culpa officia aut! Impedit sit sunt quaerat, odit, tenetur error, harum nesciunt ipsum debitis quas aliquid. Reprehenderit, quia. Quo neque error repudiandae fuga? Ipsa laudantium molestias eos sapiente officiis modi at sunt excepturi expedita sint? Sed quibusdam recusandae alias error harum maxime adipisci amet laborum. Perspiciatis minima nesciunt dolorem! Officiis iure rerum voluptates a cumque velit quibusdam sed amet tempora. Sit laborum ab, eius fugit doloribus tenetur fugiat, temporibus enim commodi iusto libero magni deleniti quod quam consequuntur! Commodi minima excepturi repudiandae velit hic maxime doloremque. Quaerat provident commodi consectetur veniam similique ad earum omnis ipsum saepe, voluptas, hic voluptates pariatur est explicabo fugiat, dolorum eligendi quam cupiditate excepturi mollitia maiores labore suscipit quas? Nulla, placeat. Voluptatem quaerat non architecto ab laudantium modi minima sunt esse temporibus sint culpa, recusandae aliquam numquam totam ratione voluptas quod exercitationem fuga. Possimus quis earum veniam quasi aliquam eligendi, placeat qui corporis!Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia,")]),
    schema.node("paragraph", { align: 'justify' }, [schema.text("Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia, molestiae quas vel sint commodi repudiandae consequuntur voluptatum laborum numquam blanditiis harum quisquam eius sed odit fugiat iusto fuga praesentium optio, eaque rerum! Provident similique accusantium nemo autem. Veritatis obcaecati tenetur iure eius earum ut molestias architecto voluptate aliquam nihil, eveniet aliquid culpa officia aut! Impedit sit sunt quaerat, odit, tenetur error, harum nesciunt ipsum debitis quas aliquid. Reprehenderit, quia. Quo neque error repudiandae fuga? Ipsa laudantium molestias eos sapiente officiis modi at sunt excepturi expedita sint? Sed quibusdam recusandae alias error harum maxime adipisci amet laborum. Perspiciatis minima nesciunt dolorem! Officiis iure rerum voluptates a cumque velit quibusdam sed amet tempora. Sit laborum ab, eius fugit doloribus tenetur fugiat, temporibus enim commodi iusto libero magni deleniti quod quam consequuntur! Commodi minima excepturi repudiandae velit hic maxime doloremque. Quaerat provident commodi consectetur veniam similique ad earum omnis ipsum saepe, voluptas, hic voluptates pariatur est explicabo fugiat, dolorum eligendi quam cupiditate excepturi mollitia maiores labore suscipit quas? Nulla, placeat. Voluptatem quaerat non architecto ab laudantium modi minima sunt esse temporibus sint culpa, recusandae aliquam numquam totam ratione voluptas quod exercitationem fuga. Possimus quis earum veniam quasi aliquam eligendi, placeat qui corporis!Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia,")]),
    schema.node("paragraph", { align: 'justify' }, [schema.text("Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia, molestiae quas vel sint commodi repudiandae consequuntur voluptatum laborum numquam blanditiis harum quisquam eius sed odit fugiat iusto fuga praesentium optio, eaque rerum! Provident similique accusantium nemo autem. Veritatis obcaecati tenetur iure eius earum ut molestias architecto voluptate aliquam nihil, eveniet aliquid culpa officia aut! Impedit sit sunt quaerat, odit, tenetur error, harum nesciunt ipsum debitis quas aliquid. Reprehenderit, quia. Quo neque error repudiandae fuga? Ipsa laudantium molestias eos sapiente officiis modi at sunt excepturi expedita sint? Sed quibusdam recusandae alias error harum maxime adipisci amet laborum. Perspiciatis minima nesciunt dolorem! Officiis iure rerum voluptates a cumque velit quibusdam sed amet tempora. Sit laborum ab, eius fugit doloribus tenetur fugiat, temporibus enim commodi iusto libero magni deleniti quod quam consequuntur! Commodi minima excepturi repudiandae velit hic maxime doloremque. Quaerat provident commodi consectetur veniam similique ad earum omnis ipsum saepe, voluptas, hic voluptates pariatur est explicabo fugiat, dolorum eligendi quam cupiditate excepturi mollitia maiores labore suscipit quas? Nulla, placeat. Voluptatem quaerat non architecto ab laudantium modi minima sunt esse temporibus sint culpa, recusandae aliquam numquam totam ratione voluptas quod exercitationem fuga. Possimus quis earum veniam quasi aliquam eligendi, placeat qui corporis!Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime mollitia,")]),
  ])


  activeMarks = signal<{ [key: string]: boolean }>({
    strong: false,
    em: false,
    strikethrough: false,
    underline: false,
    align_left: false,
    align_center: false,
    align_right: false,
    align_justify: false
  });

  public versions = signal<{ id: number, timestamp: number }[]>([])
  toggleTOC: boolean = false;




  constructor(
    private ngZone: NgZone,
    private confirmationService: ConfirmationService,
  ) {

  }



  ngAfterViewInit() {

    // Create the editor state
    let state = EditorState.create({
      doc: this.dummyDocument,
      plugins: [
        dropCursor(),
        history(),
        listKeymap,
        keymap({ "Mod-z": undo, "Mod-y": redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
        tableEditing(),
        this.createOverlayPlugin(),
        this.commentPlugin(),
        // this.dragHandlePlugin(),
        new Plugin({
          props: {
            handleClickOn(view, _pos, node, nodePos, _event, direct) {
              const { state } = view;
              const { schema } = state;
              if (
                node.type.spec.selectable &&
                direct &&
                node.type === schema.nodes['pageBreak']
              ) {
                console.log('page break clicked')
                const tr = state.tr.setSelection(
                  new NodeSelection(state.doc.resolve(nodePos))
                );
                view.dispatch(tr);
                return true;
              } else {
                return false;
              }
            }
          }
        }),
        idPlugin
        // dragElementPlugin()
      ]
    });

    // Create the editor view
    this.view = new EditorView(this.editorContainer.nativeElement, {
      state,
      editable: () => this.isOwner ? true : this.canEdit,
      dispatchTransaction: (transaction: Transaction) => {
        const newState = this.view!.state.apply(transaction);
        this.updateActiveMarks(newState);
        this.handleTOC(newState)
        this.view!.updateState(newState);
      },
      handleDrop: (_view, event, _slice) => {
        // const dropEvent = event;
        // const clipboardData = dropEvent.dataTransfer;
        // console.group('Drop Event');
        // clipboardData?.types
        //   .map(type => ({
        //     type: type,
        //     data: clipboardData?.getData(type)
        //   }))
        //   .forEach(result => {
        //     console.log(result);
        //   });
        // console.groupEnd();
        return false;
      },
      handleDOMEvents: {
        mouseup: (view, event) => {
          setTimeout(() => {
            this.updateOverlay(view);
          }, 10);
          return false;
        },

        focus: (view: EditorView, event): boolean => {
          this.editorFocus = true
          this.dragFocus = true
          return false;
        },
        blur: (view: EditorView, event): boolean => {
          this.editorFocus = false
          return false;
        },

      }
    })
    this.view.focus()
  }

  @HostListener('click', ['$event.target'])
  onClick(elem: any) {
    const className = elem.className;
    if (className === '' || className == 'editor-container' || className === 'ProseMirror ProseMirror-focused') {
      this.showComment = false;
      this.commentId = ''
    }
  }

  public get state(): EditorState {
    return this.view.state
  }



  undo() {
    undo(this.view?.state, this.view?.dispatch)
  }

  redo() {
    redo(this.view?.state, this.view?.dispatch)
  }

  addPage() {
    const { state, dispatch } = this.view;
    const pageNode = state.schema.nodes['page'].create({}, [
      state.schema.nodes['header'].create(),
      state.schema.nodes['content'].create({}, state.schema.nodes['paragraph'].create()),
      state.schema.nodes['footer'].create()
    ]);

    const tr: Transaction = state.tr.insert(state.doc.content.size, pageNode);
    dispatch(tr);
  }

  insertTable() {
    const { schema } = this.view?.state

    // Create a 3x3 table as an example
    const rowCount = 3
    const colCount = 3

    const cells: any[] = []
    for (let i = 0; i < colCount; i++) {
      cells.push(schema.nodes['table_cell'].createAndFill())
    }

    const rows = []
    for (let i = 0; i < rowCount; i++) {
      rows.push(schema.nodes['table_row'].create(null, cells))
    }

    const table = schema.nodes['table'].create(null, rows)

    if (this.view?.dispatch) {
      this.view?.dispatch(this.view?.state.tr.replaceSelectionWith(table))
    }

    return true
  }

  handleTOC(state: EditorState) {
    this.headings = []
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const domNode = this.view.domAtPos(pos + 1).node
        this.headings.push({ label: node.textContent?.trim(), level: node.attrs['level'], domNode: domNode })
      }
    })
  }


  showComment = false
  dragAndDrop() {

  }

  commentId!: string
  commentPlugin(): Plugin {
    return new Plugin({
      props: {
        handleDOMEvents: {
          click: (view, event) => {
            const target = event.target as HTMLElement;

            if (target && target.hasAttribute('data-comment-id')) {
              const id = target.getAttribute('data-comment-id')

              if (id) {
                this.commentId = id;
              }
            }
            // Handle click events if needed
          },
        },
      },
      appendTransaction(transactions, oldState: EditorState, newState: EditorState): any {
        if (transactions.some(tr => tr.docChanged)) {
          // Capture and process comments
          const comments: any[] = [];
          newState.doc.descendants((node: any, pos: number) => {
            if (node.marks) {
              node.marks.forEach((mark: any) => {
                if (mark.type.name === 'comment') {
                  comments.push({ node, pos, mark });
                }
              })
            }
          });
        }

        // return transactions[0]
      },
    });
  }

  showCommentBox() {
    this.showComment = true
  }

  addComment(comment: { id: string } = { id: '1' }) {
    const { state, dispatch } = this.view;
    const { schema, tr } = state;

    let { from, to } = state.selection;

    // Use the current user's color code
    const userColor = this.user?.colorCode;  // Assuming currentUser is accessible

    // Create the comment mark with the color attribute
    const mark = schema.marks['comment'].create({
      id: comment.id,
      color: userColor,  // Store the user's color in the mark
    });

    tr.addMark(from, to, mark);
    dispatch(tr);
  }





  generate() {

  }


  insertHTML(html: string) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    const slice = ProseDOMParser.fromSchema(this.customSchema).parse(tempElement);
    const tr = this.view.state.tr.insert(0, slice.content);
    this.view.dispatch(tr);
  }

  private createOverlayPlugin(): Plugin {
    return new Plugin({
      view: () => ({
        update: (view, prevState) => {
          this.ngZone.run(() => {
            this.updateOverlay(view);
          });
        }
      })
    });
  }


  private dragHandlePlugin() {
    const dragHandle = this.dragHand;
    return new Plugin({
      props: {
        decorations(state) {
          const { doc, selection } = state;
          const decorations: Decoration[] = [];
          doc.descendants((node, pos) => {
            if (node.isBlock) {
              // Add decoration with the drag handle for each block
              const deco = Decoration.widget(pos + 1, () => dragHandle.nativeElement, {
                side: -1
              });
              decorations.push(deco);
            }
          });

          return DecorationSet.create(doc, decorations);
        }
      }
    });
  }

  private updateOverlay(view: EditorView) {
    let state: EditorState = view.state;
    const { from, to } = state.selection;

    // If there's no selection, hide the overlay
    if (from === to) {
      this.showOverlay = false;
      return;
    }

    // Get the coordinates of the start and end of the selection
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Get the bounding rectangles of the editor and overlay
    const editorRect = this.editorContainer.nativeElement.getBoundingClientRect();
    const overlayRect = this.overlayMenuRef?.nativeElement?.getBoundingClientRect();

    // Get the scroll offset of the editor container (if it is scrollable)
    const editorScrollY = this.editorContainer.nativeElement.scrollTop;
    const editorScrollX = this.editorContainer.nativeElement.scrollLeft;

    // Get the scroll offset of the page
    const pageScrollY = window.scrollY || document.documentElement.scrollTop;
    const pageScrollX = window.scrollX || document.documentElement.scrollLeft;

    // Calculate the vertical (top) position of the overlay
    // We account for the page scroll and the scroll inside the editor container
    this.overlayTop = start.top - editorRect.top + pageScrollY + editorScrollY - overlayRect?.height;
    // Center the overlay horizontally with respect to the selection
    // Account for both the page scroll and editor container scroll
    const selectionMidpoint = (start.left + end.left) / 2;
    this.overlayLeft = selectionMidpoint - editorRect.left + pageScrollX + editorScrollX - (overlayRect?.width / 2);

    // Limit overlay positioning to the bounds of the editor
    if (this.overlayLeft < 0) {
      this.overlayLeft = 0; // Prevent overflow on the left
    } else if (this.overlayLeft + overlayRect?.width > editorRect.width) {
      this.overlayLeft = editorRect.width - overlayRect?.width; // Prevent overflow on the right
    }

    if (this.overlayLeft > 520) {
      this.overlayLeft = 520
    }
    // Set overlay visibility
    this.showOverlay = true;
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.destroy();
    }
  }

  updateActiveMarks(state: EditorState) {
    let newActiveMarks = {
      strong: this.isMarkActive(state, state.schema.marks['strong']) as boolean,
      em: this.isMarkActive(state, state.schema.marks['em']) as boolean,
      underline: this.isMarkActive(state, state.schema.marks['underline']) as boolean,
      strikethrough: this.isMarkActive(state, state.schema.marks['strikethrough']) as boolean,
      align_left: this.isAlignmentActive(state, 'left') as boolean,
      align_center: this.isAlignmentActive(state, 'center') as boolean,
      align_right: this.isAlignmentActive(state, 'right') as boolean,
      align_justify: this.isAlignmentActive(state, 'justify') as boolean,
      bullet_list: this.isNodeActive(state, state.schema.nodes['bullet_list']) as boolean,
      ordered_list: this.isNodeActive(state, state.schema.nodes['ordered_list']) as boolean,
      blockquote: this.isNodeActive(state, state.schema.nodes['blockquote']) as boolean
    };
    this.activeMarks.set(newActiveMarks);
  }

  isMarkActive(state: EditorState, type: MarkType) {
    const { from, $from, to, empty } = state.selection;
    if (empty) {
      return type.isInSet(state.storedMarks as Mark[] || $from.marks());
    }
    return state.doc.rangeHasMark(from, to, type);
  }

  isAlignmentActive(state: EditorState, alignment: string): boolean {
    const { from, to } = state.selection;
    let isActive = false;

    state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'paragraph' && node.attrs['align'] === alignment) {
        isActive = true;
      }
    });

    return isActive;
  }

  applyStyle(style: string) {
    if (!this.view) return;
    const { state, dispatch } = this.view;
    let markType !: MarkType;
    let nodeType !: NodeType;
    switch (style) {
      case MARKS.BOLD:
        markType = state.schema.marks[MARKS.BOLD];
        break;
      case MARKS.ITALIC:
        markType = state.schema.marks[MARKS.ITALIC];
        break;
      case MARKS.UNDERLINE:
        markType = state.schema.marks[MARKS.UNDERLINE];
        break;
      case MARKS.STRIKETHROUGH:
        markType = state.schema.marks[MARKS.STRIKETHROUGH];
        break
      case 'align-left':
        alignLeft(state, dispatch);
        break;
      case 'align-center':
        alignCenter(state, dispatch);
        break;
      case 'align-right':
        alignRight(state, dispatch);
        break;
      case 'align-justify':
        alignJustify(state, dispatch);
        break;
      case 'bullet-list':
        nodeType = state.schema.nodes['bullet_list'];
        console.log(nodeType, state.schema.nodes)
        toggleList(nodeType)(state, dispatch);
        break;
      case 'ordered-list':
        nodeType = state.schema.nodes['ordered_list'];
        toggleList(nodeType)(state, dispatch);
        break;
      case 'blockquote':
        console.log('blockquote')
        nodeType = state.schema.nodes['blockquote'];
        console.log(nodeType)
        toggleBlockquote(nodeType)(state, dispatch);
        break;
      case 'page_break':
        const pageBreak = state.schema.nodes['hard_break'];
        addPageBreak(state, dispatch);
        this.view.focus();
        break;

    }
    if (markType) {
      toggleMark(markType)(state, dispatch);
      // this.overlayMenuRef.hide();
      // this.updateActiveMarks(this.view.state);
    }
  }

  applyHeading(level: number | string, id: string = 'a9hs9') {
    if (!this.view) return;

    if (level === 'Paragraph') {
      return this.applyParagraph()
    }

    const { state, dispatch } = this.view;
    const headingType = state.schema.nodes['heading'];
    if (!headingType) return;
    setBlockType(headingType, { level, id })(state, dispatch);
  }

  applyParagraph() {
    const { state, dispatch } = this.view;
    const paragraphType = state.schema.nodes['paragraph'];
    if (!paragraphType) return;
    const command = setBlockType(paragraphType);
    command(state, dispatch);
  }

  isNodeActive(state: EditorState, nodeType: NodeType): boolean {
    const { from, to } = state.selection;
    let isActive = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (node.type === nodeType) {
        isActive = true;
        return false;
      }
      return true;
    });

    return isActive;
  }

  // Method to get editor content
  getContent() {
    if (!this.view) return '';
    return DOMSerializer.fromSchema(schema).serializeFragment(this.view.state.doc.content);
  }

  scrollTO(heading: any) {
    heading.domNode.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  handleCommentId(commentId: string) {
    this.commentId = commentId;
    this.addComment({ id: this.commentId })
  }


  viewMode() {
    //TODO : View mode
  }
}