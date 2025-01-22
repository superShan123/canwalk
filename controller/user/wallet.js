const Wallet = require('../../models/user/wallet')
const Order = require('../../controller/user/order')




const getWallet = async (req, res)=>{
    try{
        const userId = req.session.userId;
        if(!userId){
            return res.status(400).send('User not found')
        }

        const wallet = await Wallet.findOne({userId})


        console.log('Transactions before sorting:', wallet.transactions);

        if (wallet) {
            wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        console.log('Transactions after sorting:', wallet.transactions);
        
        const newwallet = wallet || {transactions:[]}
        
        console.log('wallet comming', newwallet)
        res.render('home/wallet',{newwallet})
    }catch(err){
        console.error('Error fetching the wallet',err)
        res.status(500).send('Internal server error')
    }
} 









module.exports = {
    getWallet

}


