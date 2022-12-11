export interface IMetaData {
  key?: string;
  value?: string;
}

export const getSongs = (content: string): string[] => {
  return content ? content.split("{new_song}") : [];
};

export const getMetaData = (line: string): IMetaData => {
  if (!line.startsWith("{")) return { value: undefined };
  let rawSplit = line.replace("{", "").replace("}", "").split(": ");
  return {
    key: rawSplit[0],
    value: rawSplit[1],
  };
};
