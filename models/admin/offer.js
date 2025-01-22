const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
    category:{
        type:String,
        required:true
    },
    discountType:{
        type:String,
        enum:['percentage','fixed'],
        required:true 
    },
    discountValue:{
        type:String,
        required:true 

    },
    expiryDate:{
        type:Date,
        required:true 
    },
    applicableProducts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product'
    }],
})


const Offer = new mongoose.model('Offer',offerSchema);

module.exports = Offer;








