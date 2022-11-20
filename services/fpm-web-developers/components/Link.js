import styled from 'styled-components';
import { hex2rgba } from '../utils/css';

export const HeaderLink = styled.a`
  display: inline-block;
  font-size: 14px;
  padding: 6px 14px;
  border-radius: 4px;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:not([disabled]) {
    cursor: pointer;
  }
`;

export const LinkOutlineButton = styled(HeaderLink)`
  padding: 9px 18px;
  border: 2px solid white;
`;

export const customLinkOutlineButton = ({ color }) =>
  styled(HeaderLink)`
    color: ${color};
    padding: 9px 18px;
    border: 2px solid ${color};
    &:not([disabled]):hover {
      background-color: ${hex2rgba(color, 0.05)};
    }
  `;

export const customLinkFilledButton = ({ color, bgColor }) =>
  styled(HeaderLink)`
    color: ${color || hex2rgba('#ffffff', 0.9)};
    padding: 9px 18px;
    &[disabled] {
      background-color: ${hex2rgba(bgColor, 0.5)};
    }
    &:not([disabled]) {
      background-color: ${bgColor};
    }
    &:not([disabled]):hover {
      background-color: ${hex2rgba(bgColor, 0.9)};
    }
  `;
