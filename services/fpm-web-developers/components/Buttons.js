import { Col, Row } from 'react-styled-flexboxgrid';
import { customLinkOutlineButton, customLinkFilledButton } from './Link';
import Loading from './Loading';

export const BackFilledButton = customLinkFilledButton({ bgColor: '#2d3236' });

export const GrayFilledButton = customLinkFilledButton({ color: '#909497', bgColor: '#E5E7E9' });

export const GrayOutlineButton = customLinkOutlineButton({ color: '#979A9A' });

export const CreateFilledButton = customLinkFilledButton({ bgColor: '#54b8df' });

export const DeleteFilledButton = customLinkFilledButton({ bgColor: '#CB4335' });

export const EditOutlineButton = customLinkOutlineButton({ color: '#2d3236' });

export const WaitingButton = ({ Button, waiting, text, color, buttonStyle = {}, textStyle = {}, ...buttonProps }) =>
  <Button style={{ ...buttonStyle, position: 'relative' }} disabled={waiting} {...buttonProps}>
    <Row middle="xs">
      {waiting &&
        <Loading
          color={color}
          size={25}
          border={3}
          space={2}
          panelStyle={{ position: 'absolute', left: 18, top: 5 }}
        />}
      <div style={{ ...textStyle, marginLeft: waiting ? 35 : 0 }}>
        {text}
      </div>
    </Row>
  </Button>;
