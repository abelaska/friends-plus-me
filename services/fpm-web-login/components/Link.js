import styled from 'styled-components';

export const HeaderLink = styled.a`
  display: inline-block;
  font-size: 14px;
  padding: 6px 14px;
  border-radius: 4px;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

export const LinkOutlineButton = styled(HeaderLink)`
  padding: 9px 18px;
  border: 2px solid white;
`;
