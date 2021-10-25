import { Typography, Box } from "@mui/material";

type Variant = import("@mui/material/styles/createTypography").Variant;

export type Lines = ReadonlyArray<
  | string
  | ReadonlyArray<
      | string
      | ((
          lineIdx: number,
          fragmentIndex: number,
          opts: RenderLineOptionalProps,
        ) => JSX.Element)
    >
>;

export interface RenderLineOptionalProps {
  variant: Variant;
  sx: import("@mui/system").SxProps;
}

export const DEFAULT_OPTIONAL_PROPS: RenderLineOptionalProps = {
  variant: "body1",
  sx: {
    whiteSpace: "pre",
    wordBreak: "break-word",
    fontSize: "1.5rem",
    // textAlign: "center",
  },
};
// const fragmentDisplay = "inline-block";

// export const renderLines = (
//   lines: Lines,
//   optionalProps?: RenderLineOptionalProps,
// ) => {
//   const opts = optionalProps ?? DEFAULT_OPTIONAL_PROPS;
//   const { variant, sx } = opts;
//   const fragmentOpts = { ...opts, sx: { ...sx, display: fragmentDisplay } };
//   return (
//     <>
//       {lines.flatMap((lineOrFragments, lineIdx) =>
//         typeof lineOrFragments === "string" ? (
//           <Typography variant={variant} key={lineIdx} sx={sx}>
//             {lineOrFragments}
//           </Typography>
//         ) : (
//           <Box
//             key={lineIdx}
//             sx={{
//               display: "flex",
//               flexWrap: "wrap",
//             }}
//           >
//             {lineOrFragments.map((lineOrComponent, fragmentIndex) =>
//               typeof lineOrComponent === "string" ? (
//                 <Typography
//                   variant={variant}
//                   key={`${lineIdx}-${fragmentIndex}`}
//                   sx={{
//                     ...sx,
//                     display: fragmentDisplay,
//                   }}
//                 >
//                   {lineOrComponent}
//                 </Typography>
//               ) : (
//                 lineOrComponent(lineIdx, fragmentIndex, fragmentOpts)
//               ),
//             )}
//           </Box>
//         ),
//       )}
//     </>
//   );
// };

// export const renderLines2 = (
//   lines: Lines,
//   optionalProps?: RenderLineOptionalProps,
// ) => {
//   const opts = optionalProps ?? DEFAULT_OPTIONAL_PROPS;
//   const { variant, sx } = opts;
//   const fragmentOpts = { ...opts, sx: { ...sx, display: fragmentDisplay } };
//   return (
//     <>
//       {lines.flatMap((lineOrFragments, lineIdx) =>
//         typeof lineOrFragments === "string" ? (
//           <Typography variant={variant} key={lineIdx} sx={sx}>
//             {lineOrFragments}
//           </Typography>
//         ) : (
//           <Typography
//             variant={variant}
//             key={lineIdx}
//             sx={{
//               ...sx,
//               display: "flex",
//               flexWrap: "wrap",
//             }}
//           >
//             {lineOrFragments.map((lineOrComponent, fragmentIndex) =>
//               typeof lineOrComponent === "string"
//                 ? lineOrComponent
//                 : lineOrComponent(lineIdx, fragmentIndex, fragmentOpts),
//             )}
//           </Typography>
//         ),
//       )}
//     </>
//   );
// };

export const renderLines = (
  lines: Lines,
  optionalProps?: RenderLineOptionalProps,
) => {
  const opts = optionalProps ?? DEFAULT_OPTIONAL_PROPS;
  const { variant, sx } = opts;
  const typographySx = {
    ...sx,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
  } as const;
  const fragmentOpts = { ...opts, sx: { ...sx } };
  return (
    <Box
      sx={{
        rowGap: "2rem",
      }}
    >
      {lines.map((lineOrFragments, lineIdx) =>
        typeof lineOrFragments === "string" ? (
          <Typography
            variant={variant}
            key={lineIdx}
            sx={typographySx}
            gutterBottom={true}
          >
            {splitToWords(lineOrFragments).map((word, wordIdx) => (
              <span key={wordIdx}>{word}</span>
            ))}
          </Typography>
        ) : (
          <Typography
            variant={variant}
            key={lineIdx}
            sx={typographySx}
            gutterBottom={true}
          >
            {lineOrFragments.map((lineOrComponent, fragmentIndex) =>
              typeof lineOrComponent === "string"
                ? splitToWords(lineOrComponent).map((word, wordIdx) => (
                    <span key={wordIdx}>{word}</span>
                  ))
                : lineOrComponent(lineIdx, fragmentIndex, fragmentOpts),
            )}
          </Typography>
        ),
      )}
    </Box>
  );
};

const splitToWords = (text: string, splitRegexp?: RegExp) => {
  if (!splitRegexp) {
    splitRegexp = /\s/;
  }
  let curResult: RegExpExecArray | null;
  // let prevIdx = 0;
  const createArrayElement = (curText: string, wordLength: number) => {
    return curText.substr(0, wordLength);
  };
  const retVal: Array<string | ReturnType<typeof createArrayElement>> = [];

  // JS does not allow specifying start index when searching for regex, so we have to make smaller and smaller string and search it from beginning.
  let stringToSearch = text;
  let currentIndex = 0;
  while (
    stringToSearch.length > 0 &&
    !!(curResult = splitRegexp.exec(stringToSearch))
  ) {
    const idx = curResult.index; // The start of matched string (non-word)

    if (idx > 0) {
      retVal.push(createArrayElement(stringToSearch, idx)); // Anything before the non-word string match is word
    }
    retVal.push(curResult[0]); // Matched non-word string (whitespace, punctuation, etc)
    const thisPartLength = idx + curResult[0].length;
    stringToSearch = stringToSearch.substr(thisPartLength);
    currentIndex += thisPartLength;
  }

  // Remember to add last item info, if needed
  if (stringToSearch.length > 0) {
    retVal.push(createArrayElement(stringToSearch, text.length - currentIndex));
  }

  return retVal;
};
