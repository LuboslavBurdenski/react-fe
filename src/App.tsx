import * as React from 'react';
import styled from 'styled-components';
import { US_ELECTION_ADDRESS } from './constants';
import { getContract } from './helpers/ethers';
import US_ELECTION from './abis/US_ELECTION.json';
import Web3Modal from 'web3modal';

// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ResultsForm from './components/ResultForms';
import LoaderTransaction from './components/LoaderTransaction';
import ConnectButton from './components/ConnectButton';
import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const ElectionActive = styled.section`
    .active{
    font-weight: bold;
    padding: 3px 30px;
    margin-top: 25px;
    border-radius: 5px;
    background: #6cf36c;
  }
  .ended{
    font-weight: bold;
    padding: 3px 30px;
    margin-top: 25px;
    border-radius: 5px;
    background: #ff7575;
  }
`
const Error = styled.span`
  background: #db1766;
  padding: 5px 50px;
  border-radius: 8px;
  color: white;
  font-weight: bolder;
  position: absolute;
  top: 75px;
  right: 0px;
  width: 250px;
`
interface IAppState {
  fetching: boolean;
  address: string;
  library: any;
  connected: boolean;
  chainId: number;
  pendingRequest: boolean;
  result: any | null;
  electionContract: any | null;
  transactionHash: string,
  info: any | null;
  currentLeader: number | string,
  seatsTrump: number,
  seatsBiden: number,
  electionEnded: boolean,
  error: string
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  electionContract: null,
  transactionHash: '',
  info: null,
  seatsTrump: 0,
  seatsBiden: 0,
  currentLeader: '',
  electionEnded: false,
  error: ''
};

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public provider: any;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };
    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions()
    });
    this.currentLeader = this.currentLeader.bind(this);
    this.handleSubmitResults = this.handleSubmitResults.bind(this);
  }

  public async componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      await this.onConnect();
      const { electionContract } = this.state;
      await this.currentLeader();
      const electionEnded = await electionContract.electionEnded();
      await this.setState({ electionEnded });
    }
  }

  public onConnect = async () => {
    this.provider = await this.web3Modal.connect();

    const library = new Web3Provider(this.provider);

    const network = await library.getNetwork();

    const address = this.provider.selectedAddress ? this.provider.selectedAddress : this.provider?.accounts[0];

    const electionContract = getContract(US_ELECTION_ADDRESS, US_ELECTION.abi, library, address);

    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      electionContract
    });
    await this.subscribeToProviderEvents(this.provider);
  };

  public subscribeToProviderEvents = async (provider: any) => {
    if (!provider.on) {
      return;
    }
    provider.on("accountsChanged", this.changedAccount);
    provider.on("networkChanged", this.networkChanged);
    provider.on("close", this.close);

    await this.web3Modal.off('accountsChanged');
  };

  public async unSubscribe(provider: any) {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }
    provider.off("accountsChanged", this.changedAccount);
    provider.off("networkChanged", this.networkChanged);
    provider.off("close", this.close);
  }

  public changedAccount = async (accounts: string[]) => {
    if (!accounts.length) {
      // Metamask Lock fire an empty accounts array 
      await this.resetApp();
    } else {
      await this.setState({ address: accounts[0] });
    }
  }

  public networkChanged = async (networkId: number) => {
    const library = new Web3Provider(this.provider);
    const network = await library.getNetwork();
    const chainId = network.chainId;
    await this.setState({ chainId, library });
  }

  public close = async () => {
    this.resetApp();
  }

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID
        }
      }
    };
    return providerOptions;
  };

  public resetApp = async () => {
    await this.web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await this.unSubscribe(this.provider);
    this.setState({ ...INITIAL_STATE });
  };

  public endElection = async () => {
    const { electionContract } = this.state;
    const confirmation = confirm("End US election");
    if (confirmation) {
      await electionContract.endElection();
      await this.setState({ electionEnded: true });
    } else {
      console.log('reject')
      return;
    }
  }

  public currentLeader = async () => {
    const { electionContract } = this.state;
    const currentLeader = await electionContract.currentLeader();
    const seatsBiden = await electionContract.seats(1);
    const seatsTrump = await electionContract.seats(2);

    await this.setState({ seatsBiden });
    await this.setState({ seatsTrump });
    await this.setState({ currentLeader });
  };


  public handleSubmitResults = async (values: any) => {
    const { state, votesBiden, votesTrump, stateSeats } = values;
    const { electionContract } = this.state;

    await this.setState({ fetching: true });

    try {
      const transaction = await electionContract.submitStateResult([state, votesBiden, votesTrump, stateSeats]);
      await this.setState({ transactionHash: transaction.hash });
      const transactionReceipt = await transaction.wait();
      console.log(transactionReceipt)
      await this.currentLeader();
      await this.setState({ fetching: false });

    } catch (e) {
      await this.setState({ fetching: false });
      await this.setState({ error: e.error.message.split(': ')[1] });
      setTimeout(async () => {
        await this.setState({ error: '' });
      }, 2000);
    }
  };

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching
    } = this.state;

    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>

         {this.state.error && <Error>
            <span>{this.state.error}</span>
          </Error>}

          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.resetApp}
            seatsBiden={this.state.seatsBiden}
            seatsTrump={this.state.seatsTrump}
            currentLeader={this.state.currentLeader}
          />

          {fetching && <span style={{ color: '#4ad9f9', fontWeight: 'bolder' }}>{this.state.transactionHash}</span>}

          {fetching && <a style={{
            background: '#4ad9f9',
            borderRadius: '5px',
            padding: '5px',
            fontWeight: 'bold',
            color: 'white'
          }} href={`https://ropsten.etherscan.io/tx/${this.state.transactionHash}`}>view on ropsten</a>}

          {fetching && <LoaderTransaction />}

          {!fetching &&
            <ResultsForm
              handleSubmitResults={this.handleSubmitResults}
            />}

          <section>
            {this.state.electionEnded ?
              <ElectionActive>
                <button className='ended'>ended</button>
              </ElectionActive>
              :
              <ElectionActive>
                <button onClick={this.endElection} className='active'>active</button>
              </ElectionActive>}
          </section>

          <SContent>
            {fetching ? (
              <Column center>
                <SContainer>
                  <Loader />
                </SContainer>
              </Column>

            ) : (
              <SLanding center>
                {!this.state.connected && <ConnectButton onClick={this.onConnect} />}
              </SLanding>
            )}
          </SContent>
        </Column>
      </SLayout >
    );
  };
}

export default App;
