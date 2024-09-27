import { RouterOutlet } from '@angular/router';
import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Schema, DOMParser } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { paginationPlugin } from './plugins/pagination-plugin';

// Define a schema with pages and paragraphs

const mySchema = new Schema({
  nodes: {
    doc: {
      content: "page+"
    },
    page: {
      content: "header content footer",
      toDOM() { return ["div", { class: "page" }, 0]; },
      parseDOM: [{ tag: "div.page" }]
    },
    header: {
      content: "block+",
      toDOM() { return ["div", { class: "header" }, 0]; },
      parseDOM: [{ tag: "div.header" }]
    },
    content: {
      content: "block+",
      toDOM() { return ["div", { class: "content" }, 0]; },
      parseDOM: [{ tag: "div.content" }]
    },
    footer: {
      content: "block+",
      toDOM() { return ["div", { class: "footer" }, 0]; },
      parseDOM: [{ tag: "div.footer" }]
    },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }]
    },
    heading: {
      group: "block",
      content: "text*",
      toDOM() { return ["h1", 0]; },
      parseDOM: [{ tag: "h1" }]
    },
    text: {
      group: "inline"
    }
  },
  marks: {}
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('editor', { static: true }) editorElement!: ElementRef;

  editorView!: EditorView;

  ngAfterViewInit() {
    const editorState = EditorState.create({
      schema: mySchema,
      plugins: [
        keymap(baseKeymap),
        paginationPlugin
      ],
    });

    this.editorView = new EditorView(this.editorElement.nativeElement, {
      state: editorState
    });
  }

  addPage() {
    const { state, dispatch } = this.editorView;
    const pageNode = state.schema.nodes['page'].create({}, [
      state.schema.nodes['header'].create(),
      state.schema.nodes['content'].create({}, state.schema.nodes['paragraph'].create()),
      state.schema.nodes['footer'].create()
    ]);

    const tr: Transaction = state.tr.insert(state.doc.content.size, pageNode);
    dispatch(tr);
  }
}
