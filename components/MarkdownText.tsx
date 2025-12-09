import React from 'react';
import { Text, TextStyle } from 'react-native';

interface MarkdownTextProps {
  children: string;
  style?: TextStyle | TextStyle[];
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Component that renders text with markdown formatting (bold and italic)
 * Supports: **bold**, __bold__, *italic*, _italic_
 */
export default function MarkdownText({ children, style }: MarkdownTextProps) {
  const parseMarkdown = (text: string): TextSegment[] => {
    const segments: TextSegment[] = [];
    let currentIndex = 0;
    
    // Regex to match markdown patterns (bold must come before italic to avoid conflicts)
    // Matches: **text**, __text__, *text*, _text_
    const markdownRegex = /(\*\*)((?:(?!\*\*).)+?)\1|(__)((?:(?!__).)+?)\3|(\*)((?:(?!\*).)+?)\5|(_)((?:(?!_).)+?)\7/g;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add plain text before the match
      if (match.index > currentIndex) {
        segments.push({
          text: text.substring(currentIndex, match.index)
        });
      }
      
      // Determine formatting type and extract content
      let isBold = false;
      let isItalic = false;
      let content = '';
      
      if (match[1] === '**') {
        isBold = true;
        content = match[2];
      } else if (match[3] === '__') {
        isBold = true;
        content = match[4];
      } else if (match[5] === '*') {
        isItalic = true;
        content = match[6];
      } else if (match[7] === '_') {
        isItalic = true;
        content = match[8];
      }
      
      // Add the formatted text
      if (content) {
        segments.push({
          text: content,
          bold: isBold,
          italic: isItalic
        });
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining plain text
    if (currentIndex < text.length) {
      segments.push({
        text: text.substring(currentIndex)
      });
    }
    
    return segments;
  };
  
  const segments = parseMarkdown(children);
  
  return (
    <Text style={style}>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={[
            segment.bold && { fontWeight: 'bold' },
            segment.italic && { fontStyle: 'italic' }
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}
