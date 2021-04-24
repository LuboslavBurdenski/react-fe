import * as React from 'react';
import styled from 'styled-components';


const WrapperInputs = styled.div`
  padding: 10px;
  border-radius: 8px;
  background: #d0c5ff;
  .submit-form{
    display: flex;
    flex-direction: column;
    input{
      border: 0;
      border-radius: 8px;
      margin: 5px;
      padding: 5px;
    }
    button{
      border: 0;
      border-radius: 8px;
      margin: 5px;
      padding: 5px;
      background: #8affd4;
      font-weight: bold;
    }
  }
`;

interface IResultInputs {
    state: string;
    votesTrump: number,
    votesBiden: number,
    stateSeats: number,
}

const INITIAL_RESULTS: IResultInputs = {
    state: '',
    votesTrump: 0,
    votesBiden: 0,
    stateSeats: 0,
}


class ResultsForm extends React.Component<any, any> {

    constructor(props: any) {
        super(props);
        this.state = {
            ...INITIAL_RESULTS,
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmitResults = this.handleSubmitResults.bind(this);
    }


    public handleChange = async (e: any) => {
        const name = e.target.name;
        let value = e.target.value;
        if (name !== 'state') {
            value = Number(value);
        }
        console.log(name)
        await this.setState({ [name]: value });
    }


    public handleSubmitResults = async (e: any) => {
        e.preventDefault();
         const electionContract = this.props.electionContract;

        const values = Object.values(this.state);
        const dataArr = [];

        for (const value of values) {
            console.log(value)
            dataArr.push(value);
        }

		await this.setState({ fetching: true });
    
		const transaction = await electionContract.submitStateResult(dataArr);
  
		await this.setState({ transactionHash: transaction.hash });
      
		const transactionReceipt = await transaction.wait();
        console.log(transactionReceipt)
		if (transactionReceipt.status !== 1) {
			// React to failure
		}		
    };


    public render = () => {
        return (
            <WrapperInputs >
                <div >

                    <form onSubmit={this.handleSubmitResults} className='submit-form'>
                        <label htmlFor="state">state</label>
                        <input onChange={this.handleChange} type="text" name="state" id="state" placeholder="Chicago" />
                        <label htmlFor="votesBiden">votes Biden</label>
                        <input onChange={this.handleChange} type="number" name="votesBiden" id="votesBiden" placeholder="500" />
                        <label htmlFor="votesTrump">votes Trump</label>
                        <input onChange={this.handleChange} type="number" name="votesTrump" id="votesTrump" placeholder="500" />
                        <label htmlFor="seats">state seats</label>
                        <input onChange={this.handleChange} type="number" name="stateSeats" id="stateSeats" placeholder="20" />
                        <button disabled={!!this.state.error}>submit election result</button>
                    </form>

                    {/* {
                        this.state.error.length !== 0 && this.state.error.map((e: string, i: number) =>
                            <div key={i}>{e}</div>
                        )
                    } */}

                </div>
            </WrapperInputs>);
    }
}




export default ResultsForm;