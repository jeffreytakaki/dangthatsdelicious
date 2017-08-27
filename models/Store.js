const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		require: "Please enter a store name!"
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default:'Point'
		},
		coordinates: [{
			type: Number,
			required: 'You must provide coordinates!'
		}],
		address: {
			type: String,
			required: "you must provide an address"	
		}

	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author'
	}
}, {
	toJSON: { virtuals: true},
	toObject: { virtuals: true}
}
);


storeSchema.index({
	name: 'text',
	description: 'text'
})

storeSchema.index({
	location: '2dsphere'
})

storeSchema.pre('save', async function(next) {
	if (!this.isModified('name')) {
		next(); // skip it
		return; // stop this function from running
	}
	this.slug = slug(this.name);
	// find other stores that have a slug of wes, wes-1, wes-2
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
	if(storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}
	next();
	// TODO make more resiliant so slugs are unique

});


storeSchema.statics.getTagsList = function() {
	// we didn't use the arrow function here because we needed access to 'this'

	return this.aggregate([
		{ $unwind: '$tags' },
		{ 
			$group: {
				_id: '$tags', 
				count: {
					$sum: 1
				}
			}
		},
		{
			$sort: {count: -1}
		}	
	]);

}


storeSchema.statics.getTopStores = function() {
	//a complex query for mongodb. like a .find but more parameters. can't use virtual because that is mongoose.
	return this.aggregate([
		// Look up stores and find review
		{ 
			$lookup: {
				from: 'reviews', 
				localField: '_id', 
				foreignField: 'store',
				// reviews is actually from the Reviews model that is lowercased and pluralized by mongodb. it's not the virtual schema name 
				as: 'reviews' //name of the new object being returned
			}
		},
		// filter for items with 2 or more reviews
		{
			$match: {
				'reviews.1': { $exists: true}
			}
		},
		// Add the average reviews field
		{
			$project: { //add a field to the actual one
				photo: '$$ROOT.photo', //$$ROOT is the original document.
				name: '$$ROOT.name',
				reviews: '$$ROOT.reviews',
				slug: '$$ROOT.slug',
				averageRating: {
					$avg: '$reviews.rating' // $ means field from data being passed in. 
				}
			}
		},
		// sort it by our new field, highest reviews first
		{
			$sort:  {
				averageRating: -1
			}
		},
		// limit to at most 10 items
		{ $limit: 10 }


	]);
}




// find reviews where the stores _id property === reviews store property. virtual is mongoose.
storeSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the store?
  foreignField: 'store' // which field on the review?
});

function autopopulate(next) {
	this.populate('reviews')
	next();
}

storeSchema.pre('find', autopopulate)
storeSchema.pre('findOne', autopopulate)

module.exports = mongoose.model('Store', storeSchema)












