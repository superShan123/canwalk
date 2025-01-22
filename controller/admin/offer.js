const Offer = require('../../models/admin/offer')
const Product = require('../../models/admin/product')



const createOffer = async (req,res)=>{
    try{
        const{category,discountType,discountValue,expiryDate,applicableProducts}= req.body;
        console.log('reqbody',req.body)

        const newOffer = new Offer({
            category,
            discountType,
            discountValue,
            expiryDate,
            applicableProducts
        });
    

         await Product.updateMany(
            {_id:{$in:applicableProducts}},
            {$set:{discount:parseInt(discountValue)}}
        )

        newOffer.save()
         console.log('offer',newOffer)

         
        res.redirect('/admin/offer')
    }catch(err){
        console.error('Error fetching the offer',err);
        res.status(500).send('Internal Server Error')
    }

}


const getCreateOffer = async (req,res)=>{
   try{
    const products = await Product.find()
    res.render('admin/addoffer',{products})
   }catch(err){
    console.error('Error fetching the offer',err)
    res.status(500).send('Internal server error')
   }
};



const getOffer = async (req,res)=>{
    try{
        const offers = await Offer.find().populate('applicableProducts','name')
        res.render('admin/offer',{offers})
        console.log('offers fetched', offers)
    }catch(err){
        console.error('Error fetching the offer')
        res.status(500).send('Internal server error')
    }
}



const deleteOffer = async (req,res)=>{
    try{
        const{id} = req.params;
        await Offer.findByIdAndDelete(id);
        res.redirect('/admin/offer')
    }catch(err){
        console.error('Error fetching the offer',err)
        res.status(500).send('Internal server error')
    }
}


const getupdateOffer = async (req,res)=>{
    try{
        const {id} = req.params;
        const offer = await Offer.findById(id).populate('applicableProducts');
        console.log('offer',offer)
        const products = await Product.find();
        res.render('admin/update-offer', {offer, products})

    }catch(err){
        console.error('Error fetching offer',err)
        res.status(500).send('Internal server error')
    }
}


const postupdateOffer = async (req,res)=>{
    try{
        const {id} = req.params;
        const {category, discountType, discountValue,expiryDate, applicableProducts} = req.body;
        await Offer.findByIdAndUpdate(id,{
            category,
            discountType,
            discountValue,
            expiryDate,
            applicableProducts
        });
        res.redirect('/admin/offer')

    }catch(err){
        console.error('Error updating offer',err);
        res.status(500).send('Internal server error')
    }
}



module.exports = {
    createOffer,
    getCreateOffer,
    getOffer,
    deleteOffer,
    getupdateOffer,
    postupdateOffer
}



