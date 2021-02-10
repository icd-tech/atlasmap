import { Atlasmap } from "@atlasmap/atlasmap";
import { Brand, Page, PageHeader, PageSection } from "@patternfly/react-core";
import React  from "react";
import atlasmapLogo from "./logo-horizontal-darkbg.png";
import MicroIframe, { pluginInterceptor, isCalledByParent } from "micro-frontend-iframe";

MicroIframe.init('CHILD-ID');

const App: React.FC = () => {
  return (
    <Page
      header={
        <PageHeader
          logo={
            <>
              <Brand src={atlasmapLogo} alt="AtlasMap Data Mapper UI" height="40" />
            </>
          }
          style={{ minHeight: 40 }}
        />
      }
    >
      <PageSection variant={"light"} noPadding={true} isFilled={true}>
        <Atlasmap />
      </PageSection>
    </Page>
  );
};

export default App;
