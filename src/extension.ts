import * as vscode from "vscode";
import { getSongs, getMetaData } from "./interpreter";
import { exportToOSB } from "./exporter";
import path = require("path");

class Editor {
  editor = vscode.window.activeTextEditor;

  alert(msg: string) {
    vscode.window.showInformationMessage(msg);
  }

  getContent() {
    return this.editor?.document.getText();
  }

  getActiveLine() {
    return this.editor?.selection.active.line;
  }
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "chordpro.exportToOSB",
    () => {
      const editor = new Editor();
      let content = editor.getContent();
      let songs = getSongs(content ? content : "");
      if (songs.length < 2)
        editor.alert("Not a batch file. Nothing to export.");
      else {
        let message;
        let fsPath;
        let fileName = vscode.window.activeTextEditor?.document.fileName;
        if (vscode.workspace.workspaceFolders !== undefined) {
          fsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
          editor.alert("Exporting chordpro batch file to OSB...");
          exportToOSB(
            getSongs(content ? content : ""),
            fileName ? fileName : ""
          );
        } else {
          message =
            "OSB exporter: Working folder not found, open a folder and try again";

          vscode.window.showErrorMessage(message);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { language: "chordpro" },
      new FooDocumentSymbolProvider()
    )
  );
}

class FooDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  private getMetaData(line: string) {
    let rawSplit = line.replace("{", "").replace("}", "").split(": ");
    return {
      key: rawSplit[0],
      value: rawSplit[1],
    };
  }

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Thenable<vscode.SymbolInformation[]> {
    return new Promise((resolve, reject) => {
      let symbols = [];
      let title = "";
      let artist = "";
      let lineRange;
      let newLineRange;
      let height = 0;

      let visibleRange = vscode.window.activeTextEditor?.visibleRanges[0];
      if (visibleRange)
        height = visibleRange?.end.line - visibleRange?.start.line;

      for (var i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i);
        if (line.text.startsWith("{") && line.text.trim().endsWith("}")) {
        }
        let meta = this.getMetaData(line.text);
        if (meta.key == "title") {
          title = meta.value;
          lineRange = line.range;
          newLineRange = new vscode.Range(
            new vscode.Position(lineRange.start.line + height / 2 - 1, 0),
            new vscode.Position(lineRange.end.line + height / 2 - 1, 0)
          );
          //   newLineRange = new vscode.Range(
          //     lineRange.start,
          //     new vscode.Position(lineRange.end.line + 30, 0)
          //   );
          //   console.log(lineRange.start, lineRange.end);
        }
        if (meta.key == "subtitle") artist = meta.value;
        if (title && artist && newLineRange) {
          symbols.push({
            name: artist + ": " + title,
            kind: vscode.SymbolKind.Field,
            location: new vscode.Location(document.uri, newLineRange),
            containerName: "",
          });
          title = "";
          artist = "";
        }
      }
      resolve(symbols);
    });
  }
}

export function deactivate() {}
