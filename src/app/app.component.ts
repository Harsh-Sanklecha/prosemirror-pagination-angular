import { RouterOutlet } from '@angular/router';
import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Schema, DOMParser } from 'prosemirror-model';

import { ContractEditorComponent } from "../@shared/contract-editor/contract-editor.component";
import { PrimeNGConfig } from 'primeng/api';
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
  imports: [RouterOutlet, ContractEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  @ViewChild('editor', { static: true }) editorElement!: ElementRef;
  title = 'prosemirror-pagination';

  constructor(private primengConfig: PrimeNGConfig) {
    this.primengConfig.ripple = true;

  }
  ngOnInit(): void {
    this.primengConfig.zIndex = {
      modal: 1100,    // dialog, sidebar
      overlay: 1000,  // dropdown, overlaypanel
      menu: 1000,     // overlay menus
      tooltip: 1100   // tooltip
    };
  }


}
