import { Uri, workspace } from "vscode";
import path = require("path");
import { IMetaData, getMetaData } from "./interpreter";
import * as fsp from "fs/promises";
import * as jszip from "jszip";

const SongHeader = '<?xml version="1.0" encoding="UTF-8"?><song>';
const SongFooter = "</song>";

const metaDataToXML = (meta: IMetaData) => {
  let key;
  if (meta.key == "subtitle") key = "author";
  else key = meta.key;
  return `<${key}>${meta.value}</${key}>`;
};

const parseLine = (line: string) => {
  if (!line || typeof line != "string") return "";
  const replacePairs = [
    ["[Verse ", "[V"],
    ["[Verse]", "[V]"],
    ["[Chorus ", "[C"],
    ["[Chorus]", "[C]"],
  ];
  if (!line.includes("[")) return line;
  else if (
    line.trim().endsWith("]") &&
    line.trim().length > 5 &&
    line.trim().length < 32
  ) {
    for (let pair of Object.values(replacePairs)) {
      if (line.startsWith(pair[0])) line = line.replace(pair[0], pair[1]);
    }
    return line;
  } else {
    let parsedLine = parseChordLine(line);
    return parsedLine.chordLine + "\n" + parsedLine.textLine;
  }
};

const parseChordLine = (line: string) => {
  let chordLine = ".";
  let matches = line.match(/\[[^\]]*]/g);
  if (matches)
    matches.forEach((match, idx) => {
      const spaces = line.indexOf(match) + 1;
      chordLine +=
        " ".repeat(spaces - chordLine.length) +
        match.slice(1, match.length - 1);
      line = line.replace(match + " ", "");
      line = line.replace(match, "");
    });
  return { chordLine, textLine: " " + line };
};

export const exportToOSB = async (songs: string[], fileName: string) => {
  let baseFilePath = path.dirname(fileName);
  let baseFileName = path.basename(fileName).split(".")[0];
  let zip = new jszip();
  for (let song of Object.values(songs)) {
    let songName = "";
    let lyrics = "";
    let xmlContent = SongHeader;
    song.split("\n").forEach((line) => {
      let meta = getMetaData(line);
      if (meta.value) {
        if (meta.key == "title") songName = meta.value;
        xmlContent += "\n" + metaDataToXML(meta);
      } else lyrics += "\n" + parseLine(line);
    });
    lyrics = lyrics.trim();
    xmlContent += "\n" + `<lyrics>\n` + lyrics + "\n</lyrics>\n" + SongFooter;
    zip.file(`${baseFileName}/${songName}`, xmlContent);
  }
  zip
    .generateAsync({ type: "uint8array" })
    .then(
      async (content) =>
        await fsp.writeFile(
          path.join(baseFilePath, baseFileName) + ".osb",
          content
        )
    );
};
