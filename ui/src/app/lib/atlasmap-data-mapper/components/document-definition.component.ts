/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { Component, Input, ViewChildren, ElementRef, EventEmitter, QueryList, ViewChild, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DocumentType, InspectionType } from '../common/config.types';
import { ConfigModel, AdmRedrawMappingLinesEvent } from '../models/config.model';
import { Field } from '../models/field.model';
import { DocumentDefinition } from '../models/document-definition.model';

import { DocumentFieldDetailComponent } from './document-field-detail.component';
import { PropertyFieldEditComponent } from './property-field-edit.component';
import { ConstantFieldEditComponent } from './constant-field-edit.component';
import { FieldEditComponent } from './field-edit.component';

import { LineMachineComponent } from './line-machine.component';
import { ModalWindowComponent } from './modal-window.component';

@Component({
  selector: 'document-definition',
  templateUrl: './document-definition.component.html',
})

export class DocumentDefinitionComponent implements OnInit {
  @Input() cfg: ConfigModel;
  @Input() isSource = false;
  @Input() modalWindow: ModalWindowComponent;

  @ViewChild('documentDefinitionElement') documentDefinitionElement: ElementRef;
  @ViewChildren('fieldDetail') fieldComponents: QueryList<DocumentFieldDetailComponent>;
  @ViewChildren('docDetail') docElements: QueryList<ElementRef>;

  dataSource: Observable<any>;

  private searchFieldCount = 0;
  private lineMachine: LineMachineComponent = null;
  private maxSearchMatch = 10000;
  private redrawMappingLinesEvent = new EventEmitter<AdmRedrawMappingLinesEvent>(true);
  private searchMode = false;
  private searchFilter = '';
  private scrollTop = 0;
  private searchResultsExist = false;
  private sourcesTargetsLabel: string;

  constructor() {
    this.dataSource = Observable.create((observer: any) => {
      observer.next(this.search(this.searchFilter));
    });
  }

  ngOnInit(): void {
    if (this.isSource) {
      this.sourcesTargetsLabel = (this.cfg.sourceDocs.length > 1) ? 'Sources' : 'Source';
    } else {
      this.sourcesTargetsLabel = (this.cfg.targetDocs.length > 1) ? 'Targets' : 'Target';
    }
  }

  getDocs() {
    return this.cfg.getDocs(this.isSource);
  }

  getLineMachine(): LineMachineComponent {
    return this.lineMachine;
  }

  setLineMachine(lm: LineMachineComponent): void {
    this.lineMachine = lm;
    if (this.redrawMappingLinesEvent.observers.length === 0) {
      this.redrawMappingLinesEvent.subscribe((event: AdmRedrawMappingLinesEvent) =>
        this.lineMachine.handleRedrawMappingLinesEvent(event));
    }
  }

  getDocDefElementPosition(docDef: DocumentDefinition): any {
    for (const c of this.docElements.toArray()) {
      if (c.nativeElement.id === docDef.name) {
        const documentElementAbsPosition: any = this.getElementPositionForElement(c.nativeElement, false, true);
        const myElement: any = this.documentDefinitionElement.nativeElement;
        const myAbsPosition: any = this.getElementPositionForElement(myElement, false, false);
        return {
          'x': (documentElementAbsPosition.x - myAbsPosition.x),
          'y': (documentElementAbsPosition.y - myAbsPosition.y)
        };
      }
    }
    return null;
  }

  getFieldDetailComponent(field: Field): DocumentFieldDetailComponent {
    for (const c of this.fieldComponents.toArray()) {
      const returnedComponent: DocumentFieldDetailComponent = c.getFieldDetailComponent(field);
      if (returnedComponent != null) {
        return returnedComponent;
      }
    }
    return null;
  }

  getElementPosition(): any {
    return this.getElementPositionForElement(this.documentDefinitionElement.nativeElement, true, false);
  }

  getElementPositionForElement(el: any, addScrollTop: boolean, subtractScrollTop: boolean): any {
    let x = 0;
    let y = 0;

    while (el != null) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent;
    }
    if (addScrollTop) {
      y += this.scrollTop;
    }
    if (subtractScrollTop) {
      y -= this.scrollTop;
    }
    return { 'x': x, 'y': y };
  }

  getFieldDetailComponentPosition(field: Field): any {
    const c: DocumentFieldDetailComponent = this.getFieldDetailComponent(field);
    if (c == null) {
      return null;
    }
    const fieldElementAbsPosition: any = c.getElementPosition();
    const myAbsPosition: any = this.getElementPosition();
    return { 'x': (fieldElementAbsPosition.x - myAbsPosition.x), 'y': (fieldElementAbsPosition.y - myAbsPosition.y) };
  }

  getImportIconCSSClass(): string {
    return'pficon pficon-import importExportIcon link';
  }

  getExportIconCSSClass(): string {
    return'pficon pficon-export importExportIcon link';
  }

  /**
   * Using the specified event, determine and read the selected file and call the document service to
   * process it.  Also update the runtime catalog.
   *
   * @param event
   */
  async processDoc(event) {
    const selectedFile = event.target.files[0];
    this.cfg.initCfg.initialized = false;
    this.cfg.initializationService.updateLoadingStatus('Importing Document');
    this.cfg.documentService.processDocument(selectedFile, InspectionType.UNKNOWN, this.isSource);

    this.cfg.mappingService.exportMappingsCatalog(null);
  }

  getFileSuffix() {
    return '.json,.xml,.xsd';
  }

  exportFile(): string {
    console.log('exportFile');
    return '';
  }

  getSearchIconCSSClass(): string {
    const cssClass = 'fa fa-search searchBoxIcon link';
    return this.searchMode ? (cssClass + ' selectedIcon') : cssClass;
  }

  getFieldCount(): number {
    let count = 0;
    for (const docDef of this.cfg.getDocs(this.isSource)) {
      if (docDef && docDef.allFields) {
        count += docDef.allFields.length;
      }
    }
    return count;
  }

  /**
   * Handle scrolling in this document definition instance.  Avoid a circular dependence with the
   * LineMachineComponent by dispatching a custom Angular mappings-line-redraw event.
   * @param event
   */
  handleScroll(event: any) {
    this.scrollTop = event.target.scrollTop;
    this.redrawMappingLinesEvent.emit({_lmcInstance: this.lineMachine});
  }

  toggleSearch(): void {
    this.searchMode = !this.searchMode;
    this.search(this.searchMode ? this.searchFilter : '');
  }

  addField(docDef: DocumentDefinition, event: any): void {
    event.stopPropagation();
    this.getDocs().push(docDef);
    const self = this;
    this.modalWindow.reset();
    this.modalWindow.confirmButtonText = 'Save';
    const isProperty = docDef.type === DocumentType.PROPERTY;
    const isConstant = docDef.type === DocumentType.CONSTANT;
    this.modalWindow.headerText = isProperty ? 'Create Property' : (isConstant ? 'Create Constant' : 'Create Field');
    this.modalWindow.nestedComponentInitializedCallback = (mw: ModalWindowComponent) => {
      if (isProperty) {
        const propertyComponent = mw.nestedComponent as PropertyFieldEditComponent;
        propertyComponent.initialize(null, docDef, mw);
      } else if (isConstant) {
        const constantComponent = mw.nestedComponent as ConstantFieldEditComponent;
        constantComponent.initialize(null, docDef, mw);
      } else {
        const fieldComponent = mw.nestedComponent as FieldEditComponent;
        fieldComponent.isSource = this.isSource;
        fieldComponent.initialize(null, docDef, true);
      }
    };
    this.modalWindow.nestedComponentType = isProperty ? PropertyFieldEditComponent
      : (isConstant ? ConstantFieldEditComponent : FieldEditComponent);
    this.modalWindow.okButtonHandler = (mw: ModalWindowComponent) => {
      if (isProperty) {
        const propertyComponent = mw.nestedComponent as PropertyFieldEditComponent;
        propertyComponent.isClosing = true;
        docDef.addField(propertyComponent.getField());
      } else if (isConstant) {
        const constantComponent = mw.nestedComponent as ConstantFieldEditComponent;
        constantComponent.isClosing = true;
        docDef.addField(constantComponent.getField());
      } else {
        const fieldComponent = mw.nestedComponent as FieldEditComponent;
        docDef.addField(fieldComponent.getField());
      }
      self.cfg.mappingService.saveCurrentMapping();
    };
    this.modalWindow.show();
  }

  isDocNameVisible(docDef: DocumentDefinition): boolean {
    if (this.searchMode && !docDef.visibleInCurrentDocumentSearch) {
      return false;
    }
    return true;
  }

  toggleFieldVisibility(docDef: DocumentDefinition): void {
    docDef.showFields = !docDef.showFields;
    this.redrawMappingLinesEvent.emit({_lmcInstance: this.lineMachine});
  }

  isAddFieldAvailable(docDef: DocumentDefinition): boolean {
    return docDef.isPropertyOrConstant;
    // https://github.com/atlasmap/atlasmap/issues/332
    //   || (!docDef.isSource && docDef.type == DocumentType.JSON)
    //   || (!docDef.isSource && docDef.type == DocumentType.XML);
  }

  /**
   * Callback function to track search box user input.
   *
   * @param event
   */
  selectionChanged(event: any): void {
    this.search(event.item['field']);
  }

  /**
   * The selectionChanged function is not called when going from one search character to none.  This function
   * however is called.
   *
   * @param event
   */
  selectionNoResults(event: any): void {
    if (!event) {
      this.search(this.searchFilter);
    }
  }

  /**
   * Mark all children of the specified field as visible and not collapsed.
   *
   * @param field
   */
  markChildrenVisible(field: Field): void {
    field.visibleInCurrentDocumentSearch = true;
    field.collapsed = false;
    if (this.searchFieldCount++ >= this.maxSearchMatch) {
      throw new Error('The maximum number of fields matching the specified search filter has beeen exceeded  ' +
        'Try using a longer field filter.');
    }
    for (const childField of field.children) {
      this.markChildrenVisible(childField);
    }
  }

  private search(searchFilter: string): any[] {
    const formattedFields: any[] = [];
    this.searchResultsExist = false;
    const searchIsEmpty: boolean = (searchFilter == null) || ('' === searchFilter);
    const defaultVisibility: boolean = searchIsEmpty ? true : false;
    for (const docDef of this.cfg.getDocs(this.isSource)) {
      docDef.visibleInCurrentDocumentSearch = defaultVisibility;
      for (const field of docDef.getAllFields()) {
        field.visibleInCurrentDocumentSearch = defaultVisibility;
      }
      if (!searchIsEmpty) {
        this.searchFieldCount = 0;
        for (const field of docDef.getAllFields()) {

          // Skip this field if it's already determined to be visible.
          if (field.visibleInCurrentDocumentSearch && !field.collapsed) {
            continue;
          }
          field.visibleInCurrentDocumentSearch = field.name.toLowerCase().includes(searchFilter.toLowerCase());
          this.searchResultsExist = this.searchResultsExist || field.visibleInCurrentDocumentSearch;

          // The current field matches the user-specified filter.
          if (field.visibleInCurrentDocumentSearch) {
            docDef.visibleInCurrentDocumentSearch = true;
            let parentField = field.parentField;

            // Direct lineage is then visible.
            while (parentField != null) {
              parentField.visibleInCurrentDocumentSearch = true;
              parentField.collapsed = false;
              parentField = parentField.parentField;
              this.searchFieldCount++;
            }

            // All fields below the matching field are also visible.
            try {
              this.markChildrenVisible(field);
            } catch (error) {
              this.cfg.errorService.info(error.message, null);
              break;
            }

            // The total number of matches is limited to allow the UI to perform.
            if (this.searchFieldCount++ >= this.maxSearchMatch) {
              this.cfg.errorService.info('The maximum number of fields matching the specified search filter has beeen exceeded  ' +
                'Try using a longer field filter.', null);
              break;
            }
          }
        }
      }
    }
    return formattedFields;  // required by typeahead - not used
  }
}